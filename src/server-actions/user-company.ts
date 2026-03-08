'use server';

import { getSession } from '@/lib/auth-session';
import logger from '@/lib/logger';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Fetch companies the current user is assigned to.
 * Returns a lightweight list for the CompanySwitcher component.
 */
export async function getUserCompanies(): Promise<{ id: string; name: string }[]> {
  try {
    const session = await getSession();
    if (!session) {
      throw new Error('Unauthorized');
    }

    const supabase = createAdminClient();

    // Get company IDs the user is assigned to
    const { data: assignments, error: assignError } = await supabase
      .from('user_companies')
      .select('company_id')
      .eq('user_id', session.user.id);

    if (assignError) throw assignError;

    const companyIds = (assignments || []).map((a) => a.company_id);
    if (companyIds.length === 0) return [];

    // Fetch company details
    const { data: companies, error: companyError } = await supabase
      .from('companies')
      .select('id, name')
      .in('id', companyIds)
      .order('name');

    if (companyError) throw companyError;
    return (companies || []).map((c) => ({ id: c.id, name: c.name }));
  } catch (error) {
    logger.error('Error fetching user companies', { error: (error as Error).message });
    throw error;
  }
}
