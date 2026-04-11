import { getSession } from '@/lib/auth-session';
import { notFound } from 'next/navigation';
import { CompanyForm } from '@/components/admin/company-form';
import { Role } from '@/lib/constants';

export default async function CreateCompanyPage() {
  const session = await getSession();

  if (!session || (session.user.role !== Role.ADMIN && session.user.role !== Role.MANAGER)) {
    notFound();
  }

  return (
    <div className="container mx-auto py-6">
      <CompanyForm mode="create" />
    </div>
  );
}
