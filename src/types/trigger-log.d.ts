export type TriggerLogEntry = {
  id: string;
  workflowId: string;
  workflowName: string;
  userId: string;
  userEmail: string;
  status: 'success' | 'error';
  requestParams: Record<string, unknown>;
  responseData: unknown;
  errorMessage: string | null;
  durationMs: number;
  createdAt: Date;
  executionId: string | null;
};

export type GetTriggerLogsParams = {
  page?: string;
  limit?: string;
  search?: string;
  workflowFilter?: string;
  companyFilter?: string;
  statusFilter?: string;
  sortField?: string;
  sortDirection?: string;
};

export type GetTriggerLogsResult = {
  logs: TriggerLogEntry[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  limit: number;
};

export type TriggerLogTableProps = {
  logs: TriggerLogEntry[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  limit: number;
  sortField: string;
  sortDirection: 'asc' | 'desc';
  searchTerm: string;
  workflowFilter: string;
  companyFilter: string;
  isClient: boolean;
  statusFilter: string;
  companies: { id: string; name: string }[];
  workflows: { id: string; name: string }[];
};
