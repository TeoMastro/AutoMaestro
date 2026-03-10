import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import logger from '@/lib/logger';

type WorkflowTokenFields = {
  id: string;
  is_active: boolean;
  has_knowledge_base?: boolean;
};

type ValidateSuccess = { workflow: WorkflowTokenFields; errorResponse: null };
type ValidateFailure = { workflow: null; errorResponse: NextResponse };
type ValidateResult = ValidateSuccess | ValidateFailure;

export async function validateWorkflowToken(
  req: NextRequest,
  context: string,
  extraSelect?: string
): Promise<ValidateResult> {
  const authHeader = req.headers.get('authorization') ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    logger.error(`${context}: missing token`);
    return {
      workflow: null,
      errorResponse: NextResponse.json({ error: 'Missing token' }, { status: 401 }),
    };
  }

  const supabase = createAdminClient();
  const selectFields = ['id', 'is_active', extraSelect].filter(Boolean).join(', ');

  const { data: workflow, error: wfError } = await supabase
    .from('workflows')
    .select(selectFields)
    .eq('token', token)
    .single();

  if (wfError || !workflow) {
    logger.error(`${context}: invalid token`, { error: wfError?.message });
    return {
      workflow: null,
      errorResponse: NextResponse.json({ error: 'Invalid token' }, { status: 401 }),
    };
  }

  if (!workflow.is_active) {
    logger.error(`${context}: workflow inactive`, { workflowId: workflow.id });
    return {
      workflow: null,
      errorResponse: NextResponse.json({ error: 'Workflow inactive' }, { status: 403 }),
    };
  }

  return { workflow: workflow as WorkflowTokenFields, errorResponse: null };
}
