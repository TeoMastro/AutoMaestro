import { getSession } from '@/lib/auth-session';
import { notFound } from 'next/navigation';
import { CompanyView } from '@/components/admin/company-view';
import {
  getCompanyById,
  getCompanyAssignments,
  getCompanyLogoSignedUrl,
} from '@/server-actions/company';
import { getAllUsersForExport } from '@/server-actions/user';
import { Role } from '@/lib/constants';
import { BreadcrumbSetter } from '@/components/layout/breadcrumb-setter';

export default async function ManageCompanyViewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await getSession();

  if (
    !session ||
    (session.user.role !== Role.ADMIN && session.user.role !== Role.MANAGER)
  ) {
    notFound();
  }

  const { id } = await params;
  const [company, assignments, users, logoUrl] = await Promise.all([
    getCompanyById(id),
    getCompanyAssignments(id),
    getAllUsersForExport({}),
    getCompanyLogoSignedUrl(id),
  ]);

  if (!company) notFound();

  return (
    <div className="container mx-auto py-6">
      <BreadcrumbSetter segment={id} label={company.name} />
      <CompanyView
        company={company}
        assignments={assignments}
        users={users}
        searchParams={await searchParams}
        currentUserId={session.user.id}
        currentUserRole={session.user.role}
        logoUrl={logoUrl}
      />
    </div>
  );
}
