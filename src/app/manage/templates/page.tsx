import { getSession } from '@/lib/auth-session';
import { notFound } from 'next/navigation';
import { Role } from '@/lib/constants';
import { TemplateLibraryTable } from '@/components/admin/template-library-table';
import { getTemplateLibraryWithPagination } from '@/server-actions/template-library';
import type { AdminTemplateLibraryPageProps } from '@/types/template-library';

export default async function ManageTemplateLibraryPage({ searchParams }: AdminTemplateLibraryPageProps) {
  const session = await getSession();

  if (!session || session.user.role !== Role.ADMIN && session.user.role !== Role.MANAGER) {
    notFound();
  }

  const params = await searchParams;
  const { items, totalCount, totalPages, currentPage, limit } =
    await getTemplateLibraryWithPagination(params);

  return (
    <div className="container mx-auto py-6">
      <TemplateLibraryTable
        items={items}
        totalCount={totalCount}
        totalPages={totalPages}
        currentPage={currentPage}
        limit={limit}
        sortField={params.sortField || 'createdAt'}
        sortDirection={(params.sortDirection as 'asc' | 'desc') || 'desc'}
        searchTerm={params.search || ''}
        isAdmin={session.user.role === Role.ADMIN}
      />
    </div>
  );
}
