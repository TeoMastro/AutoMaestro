import { cookies } from 'next/headers';
import { getUserCompanies } from '@/server-actions/user-company';

/**
 * Resolve the active company ID for the current user.
 * 1. Reads the `selectedCompany` cookie
 * 2. Falls back to the user's first assigned company
 * Returns undefined only if the user has no companies.
 */
export async function getActiveCompanyId(): Promise<string | undefined> {
  const cookieStore = await cookies();
  const fromCookie = cookieStore.get('selectedCompany')?.value;

  if (fromCookie) return fromCookie;

  // No cookie — fall back to first company
  const companies = await getUserCompanies();
  return companies[0]?.id;
}
