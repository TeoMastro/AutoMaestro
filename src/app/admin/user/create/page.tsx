import { UserForm } from '@/components/admin/user-form';
import { getSession } from '@/lib/auth-session';
import { notFound } from 'next/navigation';
import { Role } from '@/lib/constants';
import { getAllCompanies } from '@/server-actions/company';

export default async function CreateUserPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await getSession();
  if (!session) notFound();

  const callerRole = session.user.role as Role;
  const companies = callerRole === Role.MANAGER ? await getAllCompanies() : undefined;

  const resolvedSearchParams = await searchParams;
  const preselectedCompanyId = typeof resolvedSearchParams.company_id === 'string'
    ? resolvedSearchParams.company_id
    : undefined;

  return (
    <div className="container mx-auto py-6">
      <UserForm
        mode="create"
        callerRole={callerRole}
        companies={companies}
        preselectedCompanyId={preselectedCompanyId}
      />
    </div>
  );
}
