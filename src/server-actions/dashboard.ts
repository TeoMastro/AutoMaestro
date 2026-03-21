'use server';

import { getSession } from '@/lib/auth-session';
import { Role } from '@/lib/constants';
import logger from '@/lib/logger';
import { createAdminClient } from '@/lib/supabase/admin';
import type {
  DashboardData,
  DashboardStats,
  RecentChatSession,
  RecentTriggerRun,
} from '@/types/dashboard';

/**
 * For non-admin users, fetch their accessible workflow IDs via company assignments.
 */
async function getUserWorkflowIds(
  userId: string,
  companyId?: string
): Promise<string[]> {
  const supabase = createAdminClient();

  let companyQuery = supabase
    .from('user_companies')
    .select('company_id')
    .eq('user_id', userId);

  if (companyId) {
    companyQuery = companyQuery.eq('company_id', companyId);
  }

  const { data: companies, error: companyError } = await companyQuery;
  if (companyError) throw companyError;

  const companyIds = (companies || []).map((r) => r.company_id);
  if (companyIds.length === 0) return [];

  const { data: workflows, error: wfError } = await supabase
    .from('workflows')
    .select('id')
    .in('company_id', companyIds);

  if (wfError) throw wfError;
  return (workflows || []).map((r) => r.id);
}

async function getAuthContext() {
  const session = await getSession();
  if (!session) throw new Error('Unauthorized');

  const isAdmin = session.user.role === Role.ADMIN;
  const isManager = session.user.role === Role.MANAGER;
  let workflowIds: string[] | null = null;

  if (!isAdmin) {
    workflowIds = await getUserWorkflowIds(session.user.id);
  }

  return { session, isAdmin, isManager, workflowIds };
}

/**
 * Fetch date-filtered stats (chat sessions, trigger runs, success rate).
 * Called by the client component when the date range changes.
 */
export async function getDashboardStats(
  dateFrom: string,
  dateTo: string
): Promise<DashboardStats> {
  try {
    const { isAdmin, workflowIds } = await getAuthContext();

    if (!isAdmin && workflowIds && workflowIds.length === 0) {
      return {
        totalWorkflows: 0,
        activeWorkflows: 0,
        inactiveWorkflows: 0,
        chatSessions: 0,
        triggerRuns: 0,
        triggerSuccessRate: 0,
      };
    }

    const supabase = createAdminClient();

    const [workflowResult, chatLogsResult, triggerTotalResult, triggerSuccessResult] =
      await Promise.all([
        // 1. Workflow counts (not date-filtered)
        (() => {
          let q = supabase.from('workflows').select('id, is_active');
          if (workflowIds) q = q.in('id', workflowIds);
          return q;
        })(),

        // 2. Chat sessions in date range
        (() => {
          let q = supabase
            .from('chat_logs')
            .select('session_id')
            .gte('created_at', dateFrom)
            .lte('created_at', dateTo);
          if (workflowIds) q = q.in('workflow_id', workflowIds);
          return q;
        })(),

        // 3. Trigger total in date range
        (() => {
          let q = supabase
            .from('trigger_logs')
            .select('id', { count: 'exact', head: true })
            .gte('created_at', dateFrom)
            .lte('created_at', dateTo);
          if (workflowIds) q = q.in('workflow_id', workflowIds);
          return q;
        })(),

        // 4. Trigger successes in date range
        (() => {
          let q = supabase
            .from('trigger_logs')
            .select('id', { count: 'exact', head: true })
            .gte('created_at', dateFrom)
            .lte('created_at', dateTo)
            .eq('status', 'success');
          if (workflowIds) q = q.in('workflow_id', workflowIds);
          return q;
        })(),
      ]);

    const workflows = workflowResult.data || [];
    const totalWorkflows = workflows.length;
    const activeWorkflows = workflows.filter((w) => w.is_active).length;
    const inactiveWorkflows = totalWorkflows - activeWorkflows;

    const chatLogs = chatLogsResult.data || [];
    const chatSessions = new Set(chatLogs.map((r) => r.session_id)).size;

    const triggerRuns = triggerTotalResult.count ?? 0;
    const triggerSuccesses = triggerSuccessResult.count ?? 0;
    const triggerSuccessRate =
      triggerRuns > 0 ? Math.round((triggerSuccesses / triggerRuns) * 100) : 0;

    return {
      totalWorkflows,
      activeWorkflows,
      inactiveWorkflows,
      chatSessions,
      triggerRuns,
      triggerSuccessRate,
    };
  } catch (error) {
    logger.error('Error fetching dashboard stats', {
      error: (error as Error).message,
    });
    throw error;
  }
}

/**
 * Fetch full dashboard data (stats + recent activity).
 * Called on initial server render.
 */
export async function getDashboardData(
  dateFrom: string,
  dateTo: string
): Promise<DashboardData> {
  try {
    const { session, isAdmin, isManager, workflowIds } =
      await getAuthContext();

    if (!isAdmin && workflowIds && workflowIds.length === 0) {
      return {
        stats: {
          totalWorkflows: 0,
          activeWorkflows: 0,
          inactiveWorkflows: 0,
          chatSessions: 0,
          triggerRuns: 0,
          triggerSuccessRate: 0,
        },
        recentChats: [],
        recentTriggers: [],
      };
    }

    const supabase = createAdminClient();

    // For trigger logs RPC: pass user_id for non-admins.
    // The SQL function expands this to include all trigger logs from
    // workflows belonging to the user's companies (via user_companies join),
    // so managers see all activity across their assigned companies.
    // Admins see everything (no filter).
    const triggerUserId = isAdmin ? null : session.user.id;

    const [
      workflowResult,
      chatLogsResult,
      triggerTotalResult,
      triggerSuccessResult,
      recentChatsResult,
      recentTriggersResult,
    ] = await Promise.all([
      // 1. Workflow counts
      (() => {
        let q = supabase.from('workflows').select('id, is_active');
        if (workflowIds) q = q.in('id', workflowIds);
        return q;
      })(),

      // 2. Chat sessions in date range
      (() => {
        let q = supabase
          .from('chat_logs')
          .select('session_id')
          .gte('created_at', dateFrom)
          .lte('created_at', dateTo);
        if (workflowIds) q = q.in('workflow_id', workflowIds);
        return q;
      })(),

      // 3. Trigger total in date range
      (() => {
        let q = supabase
          .from('trigger_logs')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', dateFrom)
          .lte('created_at', dateTo);
        if (workflowIds) q = q.in('workflow_id', workflowIds);
        return q;
      })(),

      // 4. Trigger successes in date range
      (() => {
        let q = supabase
          .from('trigger_logs')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', dateFrom)
          .lte('created_at', dateTo)
          .eq('status', 'success');
        if (workflowIds) q = q.in('workflow_id', workflowIds);
        return q;
      })(),

      // 5a. Recent chat sessions
      supabase.rpc('get_chat_sessions', {
        p_search: '',
        p_workflow_id: null,
        p_workflow_ids: workflowIds,
        p_company_id: null,
        p_sort_field: 'last_message_at',
        p_sort_dir: 'desc',
        p_limit: 5,
        p_offset: 0,
      }),

      // 5b. Recent trigger logs
      supabase.rpc('get_trigger_logs', {
        p_search: '',
        p_workflow_id: null,
        p_user_id: triggerUserId,
        p_company_id: null,
        p_status: '',
        p_sort_field: 'created_at',
        p_sort_dir: 'desc',
        p_limit: 5,
        p_offset: 0,
      }),
    ]);

    // Process workflow counts
    const workflows = workflowResult.data || [];
    const totalWorkflows = workflows.length;
    const activeWorkflows = workflows.filter((w) => w.is_active).length;
    const inactiveWorkflows = totalWorkflows - activeWorkflows;

    // Process chat sessions (dedupe by session_id)
    const chatLogs = chatLogsResult.data || [];
    const chatSessions = new Set(chatLogs.map((r) => r.session_id)).size;

    // Process trigger counts
    const triggerRuns = triggerTotalResult.count ?? 0;
    const triggerSuccesses = triggerSuccessResult.count ?? 0;
    const triggerSuccessRate =
      triggerRuns > 0 ? Math.round((triggerSuccesses / triggerRuns) * 100) : 0;

    // Process recent chats
    const recentChatRows = (recentChatsResult.data || []) as Array<{
      session_id: string;
      workflow_name: string;
      message_count: number;
      last_message_at: string;
    }>;

    const recentChats: RecentChatSession[] = recentChatRows.map((r) => ({
      sessionId: r.session_id,
      workflowName: r.workflow_name,
      messageCount: r.message_count,
      lastMessageAt: new Date(r.last_message_at),
    }));

    // Process recent triggers
    const recentTriggerRows = (recentTriggersResult.data || []) as Array<{
      id: string;
      workflow_name: string;
      status: 'success' | 'error';
      duration_ms: number;
      created_at: string;
    }>;

    const recentTriggers: RecentTriggerRun[] = recentTriggerRows.map((r) => ({
      id: r.id,
      workflowName: r.workflow_name,
      status: r.status,
      durationMs: r.duration_ms,
      createdAt: new Date(r.created_at),
    }));

    return {
      stats: {
        totalWorkflows,
        activeWorkflows,
        inactiveWorkflows,
        chatSessions,
        triggerRuns,
        triggerSuccessRate,
      },
      recentChats,
      recentTriggers,
    };
  } catch (error) {
    logger.error('Error fetching dashboard data', {
      error: (error as Error).message,
    });
    throw error;
  }
}
