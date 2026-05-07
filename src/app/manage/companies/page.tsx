import { getSession } from '@/lib/auth-session';
import { notFound } from 'next/navigation';
import { CompanyTable } from '@/components/admin/company-table';
import { getCompaniesWithPagination } from '@/server-actions/company';
import { GetCompaniesParams } from '@/types/company';
import { Role } from '@/lib/constants';

export default async function ManageCompaniesPage({ searchParams }: { searchParams: Promise<GetCompaniesParams> }) {
  const session = await getSession();

  if (!session || session.user.role !== Role.ADMIN) {
    notFound();
  }

  const params = await searchParams;
  const { companies, totalCount, totalPages, currentPage, limit } = await getCompaniesWithPagination(params);

  return (
    <div className="container mx-auto py-6">
      <CompanyTable
        companies={companies}
        totalCount={totalCount}
        totalPages={totalPages}
        currentPage={currentPage}
        limit={limit}
        sortField={params.sortField || 'createdAt'}
        sortDirection={(params.sortDirection as 'asc' | 'desc') || 'desc'}
        searchTerm={params.search || ''}
      />
    </div>
  );
}
