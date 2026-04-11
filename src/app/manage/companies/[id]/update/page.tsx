import { getSession } from '@/lib/auth-session';
import { notFound } from 'next/navigation';
import { CompanyForm } from '@/components/admin/company-form';
import { getCompanyById, getCompanyLogoSignedUrl } from '@/server-actions/company';
import { Role } from '@/lib/constants';
import { BreadcrumbSetter } from '@/components/layout/breadcrumb-setter';

export default async function UpdateCompanyPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();

  if (!session || (session.user.role !== Role.ADMIN && session.user.role !== Role.MANAGER)) {
    notFound();
  }

  const { id } = await params;
  const [company, logoUrl] = await Promise.all([getCompanyById(id), getCompanyLogoSignedUrl(id)]);

  if (!company) notFound();

  return (
    <div className="container mx-auto py-6">
      <BreadcrumbSetter segment={id} label={company.name} />
      <CompanyForm mode="update" company={company} logoUrl={logoUrl} />
    </div>
  );
}
