import { getSession, AuthSession } from '@/lib/auth-session';
import { Role } from '@/lib/constants';
import { createAdminClient } from '@/lib/supabase/admin';

export async function checkAuth(
  allowedRoles: string[]
): Promise<AuthSession> {
  const session = await getSession();
  if (!session || !allowedRoles.includes(session.user.role)) {
    throw new Error('Unauthorized');
  }
  return session;
}

export async function checkAdminAuth(): Promise<AuthSession> {
  return checkAuth([Role.ADMIN]);
}

export async function checkAdminOrManagerAuth(): Promise<AuthSession> {
  return checkAuth([Role.ADMIN, Role.MANAGER]);
}

/**
 * Get all company IDs a manager is assigned to.
 */
export async function getManagerCompanyIds(
  managerId: string
): Promise<string[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('user_companies')
    .select('company_id')
    .eq('user_id', managerId);

  if (error) throw error;
  return (data || []).map((r) => r.company_id);
}

/**
 * Verify that a manager has access to a specific company.
 */
export async function checkManagerCompanyAccess(
  managerId: string,
  companyId: string
): Promise<void> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('user_companies')
    .select('company_id')
    .eq('user_id', managerId)
    .eq('company_id', companyId)
    .single();

  if (error || !data) {
    throw new Error('Unauthorized');
  }
}
