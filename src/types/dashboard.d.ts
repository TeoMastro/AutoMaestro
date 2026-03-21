export type DashboardStats = {
  totalWorkflows: number;
  activeWorkflows: number;
  inactiveWorkflows: number;
  chatSessions: number;
  triggerRuns: number;
  triggerSuccessRate: number;
};

export type RecentChatSession = {
  sessionId: string;
  workflowName: string;
  messageCount: number;
  lastMessageAt: Date;
};

export type RecentTriggerRun = {
  id: string;
  workflowName: string;
  status: 'success' | 'error';
  durationMs: number;
  createdAt: Date;
};

export type DashboardData = {
  stats: DashboardStats;
  recentChats: RecentChatSession[];
  recentTriggers: RecentTriggerRun[];
};
