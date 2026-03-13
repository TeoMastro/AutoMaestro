import { getSession } from '@/lib/auth-session';
import { notFound } from 'next/navigation';
import { TriggerLogTable } from '@/components/admin/trigger-log-table';
import { getTriggerLogsWithPagination, getTriggerWorkflowsForFilter } from '@/server-actions/trigger-log';
import { getAllCompanies } from '@/server-actions/company';
import type { GetTriggerLogsParams } from '@/types/trigger-log';
import { getActiveCompanyId } from '@/lib/active-company';
import { Role } from '@/lib/constants';

interface TriggerHistoryPageProps {
  searchParams: Promise<GetTriggerLogsParams>;
}

export default async function TriggerHistoryPage({ searchParams }: TriggerHistoryPageProps) {
  const session = await getSession();

  if (!session) {
    notFound();
  }

  const params = await searchParams;
  const companyId = await getActiveCompanyId();
  const companyFilter = params.companyFilter || '';
  const isClient = session.user.role === Role.CLIENT;

  // Admins/managers: use companyFilter from URL if set, otherwise see all (their) companies
  // Clients: always scoped to their active company
  const effectiveCompanyId = companyFilter || (isClient ? companyId : undefined);

  const [{ logs, totalCount, totalPages, currentPage, limit }, workflows, companies] = await Promise.all([
    getTriggerLogsWithPagination({ ...params, companyFilter: effectiveCompanyId }),
    getTriggerWorkflowsForFilter(effectiveCompanyId),
    isClient ? Promise.resolve([]) : getAllCompanies(),
  ]);

  return (
    <div className="container mx-auto py-6">
      <TriggerLogTable
        logs={logs}
        totalCount={totalCount}
        totalPages={totalPages}
        currentPage={currentPage}
        limit={limit}
        sortField={params.sortField || 'created_at'}
        sortDirection={(params.sortDirection as 'asc' | 'desc') || 'desc'}
        searchTerm={params.search || ''}
        workflowFilter={params.workflowFilter || 'all'}
        companyFilter={companyFilter || 'all'}
        isClient={isClient}
        statusFilter={params.statusFilter || 'all'}
        companies={companies}
        workflows={workflows}
      />
    </div>
  );
}
