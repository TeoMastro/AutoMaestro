import { getSession } from '@/lib/auth-session';
import { notFound } from 'next/navigation';
import { ChatSessionTable } from '@/components/admin/chat-session-table';
import { getChatSessionsWithPagination, getWorkflowsForFilter } from '@/server-actions/chat-log';
import { getAllCompanies } from '@/server-actions/company';
import type { GetChatSessionsParams } from '@/types/chat-log';
import { getActiveCompanyId } from '@/lib/active-company';
import { Role } from '@/lib/constants';

interface ChatHistoryPageProps {
  searchParams: Promise<GetChatSessionsParams>;
}

export default async function ChatHistoryPage({ searchParams }: ChatHistoryPageProps) {
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

  const [{ sessions, totalCount, totalPages, currentPage, limit }, workflows, companies] = await Promise.all([
    getChatSessionsWithPagination({ ...params, companyId: effectiveCompanyId }),
    getWorkflowsForFilter(effectiveCompanyId),
    isClient ? Promise.resolve([]) : getAllCompanies(),
  ]);

  return (
    <div className="container mx-auto py-6">
      <ChatSessionTable
        sessions={sessions}
        totalCount={totalCount}
        totalPages={totalPages}
        currentPage={currentPage}
        limit={limit}
        sortField={params.sortField || 'lastMessageAt'}
        sortDirection={(params.sortDirection as 'asc' | 'desc') || 'desc'}
        searchTerm={params.search || ''}
        workflowFilter={params.workflowFilter || 'all'}
        companyFilter={companyFilter || 'all'}
        isClient={isClient}
        companies={companies}
        workflows={workflows}
      />
    </div>
  );
}
