'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import {
  GetUsersParams,
  GetUsersResult,
  GetUsersResultWithoutPagination,
  User,
  UserFormState,
} from '@/types/user';
import {
  createUserSchema,
  formatZodErrors,
  updateUserSchema,
} from '@/lib/validation-schemas';
import { Role, Status } from '@/lib/constants';
import logger from '@/lib/logger';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  checkAdminAuth,
  checkAdminOrManagerAuth,
  getManagerCompanyIds,
} from '@/lib/auth-helpers';

export async function createUserAction(
  prevState: UserFormState,
  formData: FormData
): Promise<UserFormState> {
  try {
    const session = await checkAdminOrManagerAuth();
    const isManager = session.user.role === Role.MANAGER;

    const data = {
      first_name: formData.get('first_name')?.toString() ?? '',
      last_name: formData.get('last_name')?.toString() ?? '',
      email: formData.get('email')?.toString() ?? '',
      password: formData.get('password')?.toString() ?? '',
      role: (formData.get('role')?.toString() as Role) ?? Role.CLIENT,
      status: (formData.get('status')?.toString() as Status) ?? Status.ACTIVE,
    };

    // Managers can only create CLIENTs
    if (isManager) {
      data.role = Role.CLIENT;
    }

    const parsed = createUserSchema.safeParse(data);

    if (!parsed.success) {
      return {
        success: false,
        errors: formatZodErrors(parsed.error),
        formData: { ...data, password: '' },
        globalError: null,
      };
    }

    // Managers must provide a company_id and it must be theirs
    const companyId = formData.get('company_id')?.toString() ?? '';
    if (isManager) {
      if (!companyId) {
        return {
          success: false,
          errors: { company_id: ['companyRequired'] },
          formData: { ...parsed.data, password: '' },
          globalError: null,
        };
      }
      const managerCompanyIds = await getManagerCompanyIds(session.user.id);
      if (!managerCompanyIds.includes(companyId)) {
        throw new Error('Unauthorized');
      }
    }

    const trimmedEmail = parsed.data.email.trim().toLowerCase();

    const supabaseAdmin = createAdminClient();

    // Create the auth user via admin API
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email: trimmedEmail,
        password: parsed.data.password,
        email_confirm: true,
        user_metadata: {
          first_name: parsed.data.first_name.trim(),
          last_name: parsed.data.last_name.trim(),
        },
      });

    if (authError) {
      if (
        authError.message.includes('already') ||
        authError.message.includes('duplicate')
      ) {
        return {
          success: false,
          errors: {},
          formData: { ...parsed.data, password: '' },
          globalError: 'userAlreadyExists',
        };
      }
      throw authError;
    }

    // Update profile with role and status (trigger already created the profile)
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        role: parsed.data.role,
        status: parsed.data.status,
      })
      .eq('id', authData.user.id);

    if (profileError) {
      throw profileError;
    }

    // If a company_id was provided, assign the user to that company
    if (companyId && authData.user.id) {
      await supabaseAdmin.from('user_companies').insert({
        user_id: authData.user.id,
        company_id: companyId,
        assigned_by: session.user.id,
      });
    }

    logger.info('User created successfully', {
      adminId: session.user.id,
      createdUserId: authData.user.id,
    });

    revalidatePath('/admin/user');
  } catch (error) {
    logger.error('Unexpected error during user creation', {
      error: (error as Error).message,
      stack: (error as Error).stack,
      action: 'createUser',
    });

    return {
      success: false,
      errors: {},
      formData: {
        first_name: formData.get('first_name')?.toString() ?? '',
        last_name: formData.get('last_name')?.toString() ?? '',
        email: formData.get('email')?.toString() ?? '',
        password: '',
        role: (formData.get('role')?.toString() as Role) ?? Role.CLIENT,
        status: (formData.get('status')?.toString() as Status) ?? Status.ACTIVE,
      },
      globalError: 'unexpectedError',
    };
  }
  redirect('/admin/user?message=userCreatedSuccess');
}

export async function updateUserAction(
  userId: string,
  prevState: UserFormState,
  formData: FormData
): Promise<UserFormState> {
  try {
    const session = await checkAdminOrManagerAuth();
    const isManager = session.user.role === Role.MANAGER;

    const data = {
      first_name: formData.get('first_name')?.toString() ?? '',
      last_name: formData.get('last_name')?.toString() ?? '',
      email: formData.get('email')?.toString() ?? '',
      password: formData.get('password')?.toString() ?? '',
      role: (formData.get('role')?.toString() as Role) ?? Role.CLIENT,
      status: (formData.get('status')?.toString() as Status) ?? Status.ACTIVE,
    };

    // Managers can only update CLIENTs in their companies
    if (isManager) {
      data.role = Role.CLIENT;
      const supabaseCheck = createAdminClient();
      const { data: targetUser } = await supabaseCheck
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();
      if (!targetUser || targetUser.role !== Role.CLIENT) {
        throw new Error('Unauthorized');
      }
      // Verify user is in manager's companies
      const managerCompanyIds = await getManagerCompanyIds(session.user.id);
      const { data: userCompanies } = await supabaseCheck
        .from('user_companies')
        .select('company_id')
        .eq('user_id', userId)
        .in('company_id', managerCompanyIds);
      if (!userCompanies || userCompanies.length === 0) {
        throw new Error('Unauthorized');
      }
    }

    const parsed = updateUserSchema.safeParse(data);

    if (!parsed.success) {
      return {
        success: false,
        errors: formatZodErrors(parsed.error),
        formData: { ...data, password: '' },
        globalError: null,
      };
    }

    const trimmedEmail = parsed.data.email.trim().toLowerCase();

    const supabaseAdmin = createAdminClient();

    // Check user exists
    const { data: existingUser } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();

    if (!existingUser) {
      return {
        success: false,
        errors: {},
        formData: { ...parsed.data, password: '' },
        globalError: 'userNotFound',
      };
    }

    // Check email uniqueness
    const { data: emailTaken } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', trimmedEmail)
      .neq('id', userId)
      .single();

    if (emailTaken) {
      return {
        success: false,
        errors: {},
        formData: { ...parsed.data, password: '' },
        globalError: 'emailAlreadyTaken',
      };
    }

    // Update profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        first_name: parsed.data.first_name.trim(),
        last_name: parsed.data.last_name.trim(),
        email: trimmedEmail,
        role: parsed.data.role,
        status: parsed.data.status,
      })
      .eq('id', userId);

    if (profileError) {
      throw profileError;
    }

    // Update auth user email if changed
    await supabaseAdmin.auth.admin.updateUserById(userId, {
      email: trimmedEmail,
    });

    // Update password if provided
    if (parsed.data.password && parsed.data.password.trim() !== '') {
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: parsed.data.password,
      });
    }

    logger.info('User updated successfully', {
      adminId: session.user.id,
      updatedUserId: userId,
    });

    revalidatePath('/admin/user');
  } catch (error) {
    logger.error('Unexpected error during user update', {
      error: (error as Error).message,
      stack: (error as Error).stack,
      action: 'updateUser',
    });

    return {
      success: false,
      errors: {},
      formData: {
        first_name: formData.get('first_name')?.toString() ?? '',
        last_name: formData.get('last_name')?.toString() ?? '',
        email: formData.get('email')?.toString() ?? '',
        password: '',
        role: (formData.get('role')?.toString() as Role) ?? Role.CLIENT,
        status: (formData.get('status')?.toString() as Status) ?? Status.ACTIVE,
      },
      globalError: 'unexpectedError',
    };
  }
  redirect('/admin/user?message=userUpdatedSuccess');
}

export async function deleteUserAction(userId: string) {
  try {
    const session = await checkAdminOrManagerAuth();
    const isManager = session.user.role === Role.MANAGER;

    if (session.user.id === userId) {
      throw new Error('Cannot delete own account');
    }

    const supabaseAdmin = createAdminClient();

    // Check user exists and verify manager access
    const { data: existingUser } = await supabaseAdmin
      .from('profiles')
      .select('id, role')
      .eq('id', userId)
      .single();

    if (!existingUser) {
      throw new Error('User not found');
    }

    // Managers can only delete CLIENTs in their companies
    if (isManager) {
      if (existingUser.role !== Role.CLIENT) {
        throw new Error('Unauthorized');
      }
      const managerCompanyIds = await getManagerCompanyIds(session.user.id);
      const { data: userCompanies } = await supabaseAdmin
        .from('user_companies')
        .select('company_id')
        .eq('user_id', userId)
        .in('company_id', managerCompanyIds);
      if (!userCompanies || userCompanies.length === 0) {
        throw new Error('Unauthorized');
      }
    }

    // Delete auth user (cascade will delete profile)
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (error) {
      throw error;
    }

    logger.info('User deleted successfully', {
      adminId: session.user.id,
      deletedUserId: userId,
    });

    revalidatePath('/admin/user');

    return { success: true };
  } catch (error) {
    logger.error('Unexpected error during user deletion', {
      error: (error as Error).message,
      stack: (error as Error).stack,
      action: 'deleteUser',
    });

    throw error;
  }
}

export async function getUserById(userId: string) {
  try {
    await checkAdminOrManagerAuth();

    const supabaseAdmin = createAdminClient();

    const { data: user, error } = await supabaseAdmin
      .from('profiles')
      .select(
        'id, first_name, last_name, email, role, status, created_at, updated_at'
      )
      .eq('id', userId)
      .single();

    if (error || !user) {
      return false;
    }

    return {
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      role: user.role as Role,
      status: user.status as Status,
      createdAt: new Date(user.created_at),
      updatedAt: new Date(user.updated_at),
    };
  } catch (error) {
    logger.error('Error fetching user by ID', {
      error: (error as Error).message,
      stack: (error as Error).stack,
      action: 'getUserById',
    });
    throw error;
  }
}

async function fetchUsers(
  params: GetUsersParams & { paginate?: boolean },
  callerRole?: string,
  callerId?: string
) {
  const page = parseInt(params.page || '1');
  const limit = parseInt(params.limit || '10');
  const search = params.search || '';
  const roleFilter = params.roleFilter || 'all';
  const statusFilter = params.statusFilter || 'all';
  const sortField = params.sortField || 'created_at';
  const sortDirection = (params.sortDirection as 'asc' | 'desc') || 'desc';
  const paginate = params.paginate ?? false;

  const offset = (page - 1) * limit;

  const supabaseAdmin = createAdminClient();

  // Map sort field names
  const dbSortField =
    sortField === 'createdAt'
      ? 'created_at'
      : sortField === 'updatedAt'
        ? 'updated_at'
        : sortField === 'name'
          ? 'first_name'
          : sortField;

  // Build the query
  let query = supabaseAdmin
    .from('profiles')
    .select('id, first_name, last_name, email, role, status, created_at, updated_at', {
      count: 'exact',
    });

  // Managers only see CLIENTs in their companies
  if (callerRole === Role.MANAGER && callerId) {
    const managerCompanyIds = await getManagerCompanyIds(callerId);
    if (managerCompanyIds.length === 0) {
      return paginate
        ? { users: [], totalCount: 0, totalPages: 0, currentPage: page, limit }
        : { users: [] };
    }
    // Get user IDs in manager's companies
    const { data: companyUsers } = await supabaseAdmin
      .from('user_companies')
      .select('user_id')
      .in('company_id', managerCompanyIds);
    const userIds = (companyUsers || []).map((cu) => cu.user_id);
    if (userIds.length === 0) {
      return paginate
        ? { users: [], totalCount: 0, totalPages: 0, currentPage: page, limit }
        : { users: [] };
    }
    query = query.in('id', userIds).eq('role', Role.CLIENT);
  }

  // Apply search filter (sanitize to prevent PostgREST filter injection)
  if (search) {
    const sanitizedSearch = search.replace(/[,.()]/g, '');
    query = query.or(
      `first_name.ilike.%${sanitizedSearch}%,last_name.ilike.%${sanitizedSearch}%,email.ilike.%${sanitizedSearch}%`
    );
  }

  // Apply role filter
  if (roleFilter !== 'all') {
    query = query.eq('role', roleFilter);
  }

  // Apply status filter
  if (statusFilter !== 'all') {
    query = query.eq('status', statusFilter);
  }

  // Apply sorting
  query = query.order(dbSortField, { ascending: sortDirection === 'asc' });

  if (paginate) {
    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: users, count, error } = await query;

    if (error) {
      throw error;
    }

    const totalCount = count || 0;
    const totalPages = Math.ceil(totalCount / limit);

    const mappedUsers = (users || []).map((u) => ({
      id: u.id,
      first_name: u.first_name,
      last_name: u.last_name,
      email: u.email,
      role: u.role as Role,
      status: u.status as Status,
      createdAt: new Date(u.created_at),
      updatedAt: new Date(u.updated_at),
    }));

    return { users: mappedUsers, totalCount, totalPages, currentPage: page, limit };
  } else {
    const { data: users, error } = await query;

    if (error) {
      throw error;
    }

    const mappedUsers = (users || []).map((u) => ({
      id: u.id,
      first_name: u.first_name,
      last_name: u.last_name,
      email: u.email,
      role: u.role as Role,
      status: u.status as Status,
      createdAt: new Date(u.created_at),
      updatedAt: new Date(u.updated_at),
    }));

    return { users: mappedUsers };
  }
}

export async function getUsersWithPagination(
  params: GetUsersParams
): Promise<GetUsersResult> {
  const session = await checkAdminOrManagerAuth();
  return fetchUsers(
    { ...params, paginate: true },
    session.user.role,
    session.user.id
  ) as Promise<GetUsersResult>;
}

export async function getAllUsersForExport(
  params: Omit<GetUsersParams, 'page' | 'limit'>
): Promise<User[]> {
  const session = await checkAdminOrManagerAuth();
  const result = await fetchUsers(
    { ...params, paginate: false },
    session.user.role,
    session.user.id
  );
  return (result as GetUsersResultWithoutPagination).users;
}
