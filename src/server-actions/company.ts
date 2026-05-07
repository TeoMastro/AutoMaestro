'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { Role } from '@/lib/constants';
import { checkAdminAuth, checkAdminOrManagerAuth, getManagerCompanyIds } from '@/lib/auth-helpers';
import {
  createCompanySchema,
  updateCompanySchema,
  assignUserToCompanySchema,
  formatZodErrors,
} from '@/lib/validation-schemas';
import logger from '@/lib/logger';
import { createAdminClient } from '@/lib/supabase/admin';
import { encrypt, decrypt } from '@/lib/encryption';
import { buildOrIlikeFilter } from '@/lib/supabase/search';
import type {
  Company,
  CompanyFormState,
  AssignUserToCompanyFormState,
  GetCompaniesParams,
  GetCompaniesResult,
} from '@/types/company';

const LOGO_BUCKET = 'company-logos';
const MAX_LOGO_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB
const ALLOWED_LOGO_TYPES = ['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp'] as const;

function mapCompany(c: Record<string, unknown>): Company {
  const encryptedPassword = (c.n8n_instance_password as string | null) ?? null;
  let decryptedPassword: string | null = null;
  if (encryptedPassword) {
    try {
      decryptedPassword = decrypt(encryptedPassword);
    } catch {
      decryptedPassword = null;
    }
  }

  return {
    id: c.id as string,
    name: c.name as string,
    note: (c.note as string | null) ?? null,
    logoStoragePath: (c.logo_storage_path as string | null) ?? null,
    n8nInstanceUrl: (c.n8n_instance_url as string | null) ?? null,
    n8nInstanceUsername: (c.n8n_instance_username as string | null) ?? null,
    n8nInstancePassword: decryptedPassword,
    createdAt: new Date(c.created_at as string),
    updatedAt: new Date(c.updated_at as string),
  };
}

// ============================================================
// Admin: CRUD
// ============================================================

export async function createCompanyAction(prevState: CompanyFormState, formData: FormData): Promise<CompanyFormState> {
  try {
    await checkAdminAuth();

    const data = {
      name: formData.get('name')?.toString() ?? '',
      note: formData.get('note')?.toString() ?? '',
      n8n_instance_url: formData.get('n8n_instance_url')?.toString() ?? '',
      n8n_instance_username: formData.get('n8n_instance_username')?.toString() ?? '',
      n8n_instance_password: formData.get('n8n_instance_password')?.toString() ?? '',
    };

    const parsed = createCompanySchema.safeParse(data);
    if (!parsed.success) {
      return {
        success: false,
        errors: formatZodErrors(parsed.error),
        formData: {
          name: data.name,
          note: data.note,
          n8nInstanceUrl: data.n8n_instance_url,
          n8nInstanceUsername: data.n8n_instance_username,
          n8nInstancePassword: data.n8n_instance_password,
        },
        globalError: null,
      };
    }

    const rawPassword = parsed.data.n8n_instance_password?.trim() || null;

    const supabase = createAdminClient();
    const { error } = await supabase.from('companies').insert({
      name: parsed.data.name.trim(),
      note: parsed.data.note?.trim() || null,
      n8n_instance_url: parsed.data.n8n_instance_url?.trim() || null,
      n8n_instance_username: parsed.data.n8n_instance_username?.trim() || null,
      n8n_instance_password: rawPassword ? encrypt(rawPassword) : null,
    });

    if (error) throw error;

    logger.info('Company created');
    revalidatePath('/manage/companies');
  } catch (error) {
    logger.error('Error creating company', { error: (error as Error).message });
    return {
      success: false,
      errors: {},
      formData: {
        name: formData.get('name')?.toString() ?? '',
        note: formData.get('note')?.toString() ?? '',
        n8nInstanceUrl: formData.get('n8n_instance_url')?.toString() ?? '',
        n8nInstanceUsername: formData.get('n8n_instance_username')?.toString() ?? '',
        n8nInstancePassword: formData.get('n8n_instance_password')?.toString() ?? '',
      },
      globalError: 'unexpectedError',
    };
  }
  redirect('/manage/companies?message=companyCreatedSuccess');
}

export async function updateCompanyAction(
  companyId: string,
  prevState: CompanyFormState,
  formData: FormData
): Promise<CompanyFormState> {
  try {
    await checkAdminAuth();

    const data = {
      name: formData.get('name')?.toString() ?? '',
      note: formData.get('note')?.toString() ?? '',
      n8n_instance_url: formData.get('n8n_instance_url')?.toString() ?? '',
      n8n_instance_username: formData.get('n8n_instance_username')?.toString() ?? '',
      n8n_instance_password: formData.get('n8n_instance_password')?.toString() ?? '',
    };

    const parsed = updateCompanySchema.safeParse(data);
    if (!parsed.success) {
      return {
        success: false,
        errors: formatZodErrors(parsed.error),
        formData: {
          name: data.name,
          note: data.note,
          n8nInstanceUrl: data.n8n_instance_url,
          n8nInstanceUsername: data.n8n_instance_username,
          n8nInstancePassword: data.n8n_instance_password,
        },
        globalError: null,
      };
    }

    const rawPassword = parsed.data.n8n_instance_password?.trim() || null;

    const supabase = createAdminClient();
    const { error } = await supabase
      .from('companies')
      .update({
        name: parsed.data.name.trim(),
        note: parsed.data.note?.trim() || null,
        n8n_instance_url: parsed.data.n8n_instance_url?.trim() || null,
        n8n_instance_username: parsed.data.n8n_instance_username?.trim() || null,
        n8n_instance_password: rawPassword ? encrypt(rawPassword) : null,
      })
      .eq('id', companyId);

    if (error) throw error;

    logger.info('Company updated', { companyId });
    revalidatePath('/manage/companies');
    revalidatePath(`/manage/companies/${companyId}`);
  } catch (error) {
    logger.error('Error updating company', { error: (error as Error).message });
    return {
      success: false,
      errors: {},
      formData: {
        name: formData.get('name')?.toString() ?? '',
        note: formData.get('note')?.toString() ?? '',
        n8nInstanceUrl: formData.get('n8n_instance_url')?.toString() ?? '',
        n8nInstanceUsername: formData.get('n8n_instance_username')?.toString() ?? '',
        n8nInstancePassword: formData.get('n8n_instance_password')?.toString() ?? '',
      },
      globalError: 'unexpectedError',
    };
  }
  redirect(`/manage/companies?message=companyUpdatedSuccess`);
}

export async function deleteCompanyAction(companyId: string) {
  try {
    const session = await checkAdminAuth();

    const supabase = createAdminClient();
    const { error } = await supabase.from('companies').delete().eq('id', companyId);

    if (error) throw error;

    logger.info('Company deleted', { adminId: session.user.id, companyId });
    revalidatePath('/manage/companies');

    return { success: true };
  } catch (error) {
    logger.error('Error deleting company', { error: (error as Error).message });
    throw error;
  }
}

// ============================================================
// Admin: User assignments
// ============================================================

export async function assignUserToCompanyAction(
  prevState: AssignUserToCompanyFormState,
  formData: FormData
): Promise<AssignUserToCompanyFormState> {
  try {
    const session = await checkAdminAuth();

    const data = {
      user_id: formData.get('user_id')?.toString() ?? '',
      company_id: formData.get('company_id')?.toString() ?? '',
    };

    const parsed = assignUserToCompanySchema.safeParse(data);
    if (!parsed.success) {
      return {
        success: false,
        errors: formatZodErrors(parsed.error),
        formData: data,
        globalError: null,
      };
    }

    const supabase = createAdminClient();
    const { error } = await supabase.from('user_companies').upsert(
      {
        user_id: parsed.data.user_id,
        company_id: parsed.data.company_id,
        assigned_by: session.user.id,
      },
      { onConflict: 'user_id,company_id' }
    );

    if (error) throw error;

    logger.info('User assigned to company', {
      adminId: session.user.id,
      userId: parsed.data.user_id,
      companyId: parsed.data.company_id,
    });

    revalidatePath(`/manage/companies/${parsed.data.company_id}`);

    return { success: true, errors: {}, formData: data, globalError: null };
  } catch (error) {
    logger.error('Error assigning user to company', {
      error: (error as Error).message,
    });
    return {
      success: false,
      errors: {},
      formData: {
        user_id: formData.get('user_id')?.toString() ?? '',
        company_id: formData.get('company_id')?.toString() ?? '',
      },
      globalError: 'unexpectedError',
    };
  }
}

export async function unassignUserFromCompanyAction(userId: string, companyId: string) {
  try {
    await checkAdminAuth();

    const supabase = createAdminClient();
    const { error } = await supabase.from('user_companies').delete().eq('user_id', userId).eq('company_id', companyId);

    if (error) throw error;

    revalidatePath(`/manage/companies/${companyId}`);
    return { success: true };
  } catch (error) {
    logger.error('Error unassigning user from company', {
      error: (error as Error).message,
    });
    throw error;
  }
}

// ============================================================
// Admin: Data fetches
// ============================================================

export async function getCompanyById(companyId: string): Promise<Company | false> {
  try {
    await checkAdminAuth();

    const supabase = createAdminClient();
    const { data, error } = await supabase.from('companies').select('*').eq('id', companyId).single();

    if (error || !data) return false;
    return mapCompany(data as Record<string, unknown>);
  } catch (error) {
    logger.error('Error fetching company', { error: (error as Error).message });
    throw error;
  }
}

export async function getCompaniesWithPagination(params: GetCompaniesParams): Promise<GetCompaniesResult> {
  try {
    await checkAdminAuth();

    const page = parseInt(params.page || '1');
    const limit = parseInt(params.limit || '10');
    const search = params.search || '';
    const sortField = params.sortField || 'created_at';
    const sortDirection = (params.sortDirection as 'asc' | 'desc') || 'desc';
    const offset = (page - 1) * limit;

    const supabase = createAdminClient();
    let query = supabase.from('companies').select('*', { count: 'exact' });

    if (search) {
      query = query.or(buildOrIlikeFilter(['name', 'note'], search));
    }

    const dbSort = sortField === 'createdAt' ? 'created_at' : sortField === 'updatedAt' ? 'updated_at' : sortField;

    query = query.order(dbSort, { ascending: sortDirection === 'asc' });
    query = query.range(offset, offset + limit - 1);

    const { data, count, error } = await query;
    if (error) throw error;

    const companies = (data || []).map((c) => mapCompany(c as Record<string, unknown>));
    const totalCount = count || 0;
    const totalPages = Math.ceil(totalCount / limit);

    return { companies, totalCount, totalPages, currentPage: page, limit };
  } catch (error) {
    logger.error('Error fetching companies', {
      error: (error as Error).message,
    });
    throw error;
  }
}

// Used by admin and manager to populate company dropdowns (workflows, history filters).
// Managers are scoped to companies they're assigned to via user_companies.
export async function getAllCompanies(): Promise<{ id: string; name: string }[]> {
  try {
    const session = await checkAdminOrManagerAuth();

    const supabase = createAdminClient();
    let query = supabase.from('companies').select('id, name').order('name');

    if (session.user.role === Role.MANAGER) {
      const companyIds = await getManagerCompanyIds(session.user.id);
      if (companyIds.length === 0) {
        return [];
      }
      query = query.in('id', companyIds);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map((c) => ({ id: c.id, name: c.name }));
  } catch (error) {
    logger.error('Error fetching all companies', {
      error: (error as Error).message,
    });
    throw error;
  }
}

export async function getCompanyAssignments(companyId: string): Promise<
  {
    userId: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
    assignedAt: Date;
    assignedBy: string | null;
  }[]
> {
  try {
    await checkAdminAuth();

    const supabase = createAdminClient();
    const { data: assignments, error } = await supabase
      .from('user_companies')
      .select('user_id, company_id, assigned_at, assigned_by')
      .eq('company_id', companyId);

    if (error) throw error;

    const userIds = (assignments || []).map((a) => a.user_id);
    let profileMap: Record<
      string,
      {
        id: string;
        first_name: string | null;
        last_name: string | null;
        email: string;
      }
    > = {};

    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .in('id', userIds);

      profileMap = Object.fromEntries((profiles || []).map((p) => [p.id, p]));
    }

    return (assignments || []).map((row) => {
      const profile = profileMap[row.user_id];
      return {
        userId: row.user_id,
        firstName: profile?.first_name ?? null,
        lastName: profile?.last_name ?? null,
        email: profile?.email ?? '',
        assignedAt: new Date(row.assigned_at),
        assignedBy: row.assigned_by ?? null,
      };
    });
  } catch (error) {
    logger.error('Error fetching company assignments', {
      error: (error as Error).message,
    });
    throw error;
  }
}

// ============================================================
// Admin: Company Logo
// ============================================================

export async function uploadCompanyLogoAction(
  companyId: string,
  formData: FormData
): Promise<{ success: boolean; error?: string; signedUrl?: string }> {
  try {
    await checkAdminAuth();

    const file = formData.get('logo') as File | null;
    if (!file || file.size === 0) {
      return { success: false, error: 'logoRequired' };
    }

    if (file.size > MAX_LOGO_SIZE_BYTES) {
      return { success: false, error: 'logoTooLarge' };
    }

    const mimeType = file.type.toLowerCase();
    if (!ALLOWED_LOGO_TYPES.includes(mimeType as (typeof ALLOWED_LOGO_TYPES)[number])) {
      return { success: false, error: 'logoInvalidType' };
    }

    const ext = mimeType === 'image/svg+xml' ? 'svg' : mimeType.split('/')[1];
    const storagePath = `${companyId}/logo.${ext}`;

    const supabase = createAdminClient();

    // Remove old logo if it exists
    const { data: existing } = await supabase
      .from('companies')
      .select('logo_storage_path')
      .eq('id', companyId)
      .single();

    if (existing?.logo_storage_path) {
      await supabase.storage.from(LOGO_BUCKET).remove([existing.logo_storage_path]);
    }

    // Upload file directly server-side
    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await supabase.storage.from(LOGO_BUCKET).upload(storagePath, buffer, {
      contentType: mimeType,
      upsert: true,
    });

    if (uploadError) throw uploadError;

    // Update DB record
    const { error: updateError } = await supabase
      .from('companies')
      .update({ logo_storage_path: storagePath })
      .eq('id', companyId);

    if (updateError) throw updateError;

    // Get signed URL to return to client
    const { data: urlData } = await supabase.storage.from(LOGO_BUCKET).createSignedUrl(storagePath, 3600);

    logger.info('Company logo uploaded', { companyId, storagePath });
    revalidatePath('/manage/companies');
    revalidatePath(`/manage/companies/${companyId}`);

    return { success: true, signedUrl: urlData?.signedUrl ?? undefined };
  } catch (error) {
    logger.error('Error uploading company logo', {
      error: (error as Error).message,
    });
    return { success: false, error: 'unexpectedError' };
  }
}

export async function deleteCompanyLogoAction(companyId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await checkAdminAuth();

    const supabase = createAdminClient();

    const { data: existing } = await supabase
      .from('companies')
      .select('logo_storage_path')
      .eq('id', companyId)
      .single();

    if (existing?.logo_storage_path) {
      await supabase.storage.from(LOGO_BUCKET).remove([existing.logo_storage_path]);
    }

    const { error } = await supabase.from('companies').update({ logo_storage_path: null }).eq('id', companyId);

    if (error) throw error;

    logger.info('Company logo deleted', { companyId });
    revalidatePath('/manage/companies');
    revalidatePath(`/manage/companies/${companyId}`);

    return { success: true };
  } catch (error) {
    logger.error('Error deleting company logo', {
      error: (error as Error).message,
    });
    return { success: false, error: 'unexpectedError' };
  }
}

export async function getCompanyLogoSignedUrl(companyId: string): Promise<string | null> {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase.from('companies').select('logo_storage_path').eq('id', companyId).single();

    if (error || !data?.logo_storage_path) return null;

    const { data: urlData } = await supabase.storage.from(LOGO_BUCKET).createSignedUrl(data.logo_storage_path, 3600);

    return urlData?.signedUrl ?? null;
  } catch {
    return null;
  }
}
