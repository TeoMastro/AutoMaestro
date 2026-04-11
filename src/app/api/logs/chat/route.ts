import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { validateWorkflowToken } from '@/lib/api/validate-workflow-token';
import logger from '@/lib/logger';

export async function POST(req: NextRequest) {
  const { workflow, errorResponse } = await validateWorkflowToken(req, 'api/logs/chat');
  if (errorResponse) return errorResponse;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    logger.error('api/logs/chat: invalid JSON body', { workflowId: workflow.id });
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { session_id, human_message, ai_response } = body;

  if (!session_id || !human_message || !ai_response) {
    logger.error('api/logs/chat: missing required fields', { workflowId: workflow.id });
    return NextResponse.json({ error: 'session_id, human_message, and ai_response are required' }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { error: insertError } = await supabase.from('chat_logs').insert({
    workflow_id: workflow.id,
    session_id: String(session_id),
    human_message: String(human_message),
    ai_response: String(ai_response),
  });

  if (insertError) {
    logger.error('api/logs/chat: insert failed', { workflowId: workflow.id, error: insertError.message });
    return NextResponse.json({ error: 'Insert failed' }, { status: 500 });
  }

  return NextResponse.json({ success: true }, { status: 200 });
}
