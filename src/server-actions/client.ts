'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { UserFormState } from '@/types/user';
import { createUserSchema, formatZodErrors } from '@/lib/validation-schemas';
import { Role, Status } from '@/lib/constants';
import { checkResourceLimit } from '@/lib/subscription';
import logger from '@/lib/logger';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkAdminOrManagerAuth, getManagerCompanyIds, requireActiveSubscription } from '@/lib/auth-helpers';

export async function createClientAction(prevState: UserFormState, formData: FormData): Promise<UserFormState> {
  let companyId = '';

  try {
    const session = await checkAdminOrManagerAuth();
    requireActiveSubscription(session);

    const data = {
      first_name: formData.get('first_name')?.toString() ?? '',
      last_name: formData.get('last_name')?.toString() ?? '',
      email: formData.get('email')?.toString() ?? '',
      password: formData.get('password')?.toString() ?? '',
      role: Role.CLIENT as Role,
      status: Status.ACTIVE as Status,
    };

    const parsed = createUserSchema.safeParse(data);

    if (!parsed.success) {
      return {
        success: false,
        errors: formatZodErrors(parsed.error),
        formData: { ...data, password: '' },
        globalError: null,
      };
    }

    // Check resource limit for managers
    if (session.user.role === Role.MANAGER) {
      const limitCheck = await checkResourceLimit(session.user.id, 'clients');
      if (!limitCheck.allowed) {
        return {
          success: false,
          errors: {},
          formData: { ...data, password: '' },
          globalError: 'clientLimitReached',
        };
      }
    }

    // Validate company_id
    companyId = formData.get('company_id')?.toString() ?? '';
    if (!companyId) {
      return {
        success: false,
        errors: { company_id: ['companyRequired'] },
        formData: { ...parsed.data, password: '' },
        globalError: null,
      };
    }

    // Verify manager has access to this company
    if (session.user.role === Role.MANAGER) {
      const managerCompanyIds = await getManagerCompanyIds(session.user.id);
      if (!managerCompanyIds.includes(companyId)) {
        throw new Error('Unauthorized');
      }
    }

    const trimmedEmail = parsed.data.email.trim().toLowerCase();
    const supabaseAdmin = createAdminClient();

    // Create the auth user via admin API
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: trimmedEmail,
      password: parsed.data.password,
      email_confirm: true,
      user_metadata: {
        first_name: parsed.data.first_name.trim(),
        last_name: parsed.data.last_name.trim(),
        created_by_admin: 'true',
      },
    });

    if (authError) {
      if (authError.message.includes('already') || authError.message.includes('duplicate')) {
        return {
          success: false,
          errors: {},
          formData: { ...parsed.data, password: '' },
          globalError: 'userAlreadyExists',
        };
      }
      throw authError;
    }

    // Update profile with role and status
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        role: Role.CLIENT,
        status: Status.ACTIVE,
      })
      .eq('id', authData.user.id);

    if (profileError) {
      throw profileError;
    }

    // Assign user to company
    await supabaseAdmin.from('user_companies').insert({
      user_id: authData.user.id,
      company_id: companyId,
      assigned_by: session.user.id,
    });

    logger.info('Client created successfully by manager', {
      managerId: session.user.id,
      createdUserId: authData.user.id,
      companyId,
    });

    revalidatePath(`/manage/companies/${companyId}`);
  } catch (error) {
    logger.error('Unexpected error during client creation', {
      error: (error as Error).message,
      stack: (error as Error).stack,
      action: 'createClient',
    });

    return {
      success: false,
      errors: {},
      formData: {
        first_name: formData.get('first_name')?.toString() ?? '',
        last_name: formData.get('last_name')?.toString() ?? '',
        email: formData.get('email')?.toString() ?? '',
        password: '',
        role: Role.CLIENT,
        status: Status.ACTIVE,
      },
      globalError: 'unexpectedError',
    };
  }
  redirect(`/manage/companies/${companyId}?message=userCreatedSuccess`);
}
