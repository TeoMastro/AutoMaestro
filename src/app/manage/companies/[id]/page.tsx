import { getSession } from '@/lib/auth-session';
import { notFound } from 'next/navigation';
import { CompanyView } from '@/components/admin/company-view';
import { getCompanyById, getCompanyAssignments } from '@/server-actions/company';
import { getAllUsersForExport } from '@/server-actions/user';
import { Role } from '@/lib/constants';

export default async function ManageCompanyViewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await getSession();

  if (!session || session.user.role !== Role.ADMIN && session.user.role !== Role.MANAGER) {
    notFound();
  }

  const { id } = await params;
  const [company, assignments, users] = await Promise.all([
    getCompanyById(id),
    getCompanyAssignments(id),
    getAllUsersForExport({}),
  ]);

  if (!company) notFound();

  return (
    <div className="container mx-auto py-6">
      <CompanyView company={company} assignments={assignments} users={users} searchParams={await searchParams} currentUserId={session.user.id} currentUserRole={session.user.role} />
    </div>
  );
}
