import { getSession } from '@/lib/auth-session';
import { notFound } from 'next/navigation';
import { Role } from '@/lib/constants';
import { ClientForm } from '@/components/manage/client-form';
import { getCompanyById } from '@/server-actions/company';

export default async function CreateClientPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await getSession();

  if (!session || session.user.role !== Role.ADMIN) {
    notFound();
  }

  const resolvedSearchParams = await searchParams;
  const companyId = typeof resolvedSearchParams.company_id === 'string' ? resolvedSearchParams.company_id : undefined;

  if (!companyId) {
    notFound();
  }

  const company = await getCompanyById(companyId);
  if (!company) {
    notFound();
  }

  return (
    <div className="container mx-auto py-6">
      <ClientForm companyId={companyId} />
    </div>
  );
}
