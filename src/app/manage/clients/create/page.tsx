import { getSession } from '@/lib/auth-session';
import { notFound } from 'next/navigation';
import { Role } from '@/lib/constants';
import { ClientForm } from '@/components/manage/client-form';
import { getCompanyById } from '@/server-actions/company';
import { getManagerCompanyIds } from '@/lib/auth-helpers';

export default async function CreateClientPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await getSession();

  if (
    !session ||
    (session.user.role !== Role.ADMIN && session.user.role !== Role.MANAGER)
  ) {
    notFound();
  }

  const resolvedSearchParams = await searchParams;
  const companyId =
    typeof resolvedSearchParams.company_id === 'string'
      ? resolvedSearchParams.company_id
      : undefined;

  if (!companyId) {
    notFound();
  }

  // Verify the company exists
  const company = await getCompanyById(companyId);
  if (!company) {
    notFound();
  }

  // Verify manager has access to this company
  if (session.user.role === Role.MANAGER) {
    const managerCompanyIds = await getManagerCompanyIds(session.user.id);
    if (!managerCompanyIds.includes(companyId)) {
      notFound();
    }
  }

  return (
    <div className="container mx-auto py-6">
      <ClientForm companyId={companyId} />
    </div>
  );
}
