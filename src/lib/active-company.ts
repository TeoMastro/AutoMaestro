import { getUserCompanies } from '@/server-actions/user-company';

/**
 * Return the user's first assigned company ID.
 * Returns undefined only if the user has no companies.
 */
export async function getActiveCompanyId(): Promise<string | undefined> {
  const companies = await getUserCompanies();
  return companies[0]?.id;
}
