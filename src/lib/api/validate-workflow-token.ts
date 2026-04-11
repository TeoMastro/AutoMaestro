import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import logger from '@/lib/logger';

const baseWorkflowSchema = z.object({
  id: z.string(),
  is_active: z.boolean(),
});

type BaseWorkflow = z.infer<typeof baseWorkflowSchema>;

type ValidateSuccess<T> = { workflow: BaseWorkflow & T; errorResponse: null };
type ValidateFailure = { workflow: null; errorResponse: NextResponse };
type ValidateResult<T> = ValidateSuccess<T> | ValidateFailure;

export async function validateWorkflowToken<
  Extra extends z.ZodRawShape = Record<string, never>,
>(
  req: NextRequest,
  context: string,
  extraSchema?: z.ZodObject<Extra>
): Promise<ValidateResult<z.infer<z.ZodObject<Extra>>>> {
  const authHeader = req.headers.get('authorization') ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    logger.error(`${context}: missing token`);
    return {
      workflow: null,
      errorResponse: NextResponse.json(
        { error: 'Missing token' },
        { status: 401 }
      ),
    };
  }

  const fullSchema = extraSchema
    ? baseWorkflowSchema.extend(extraSchema.shape)
    : baseWorkflowSchema;
  const selectFields = Object.keys(fullSchema.shape).join(', ');

  const supabase = createAdminClient();
  const { data, error: wfError } = await supabase
    .from('workflows')
    .select(selectFields)
    .eq('token', token)
    .single();

  if (wfError || !data) {
    logger.error(`${context}: invalid token`, { error: wfError?.message });
    return {
      workflow: null,
      errorResponse: NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      ),
    };
  }

  const parsed = fullSchema.safeParse(data);
  if (!parsed.success) {
    logger.error(`${context}: workflow row failed schema validation`, {
      error: parsed.error.message,
    });
    return {
      workflow: null,
      errorResponse: NextResponse.json(
        { error: 'Invalid workflow data' },
        { status: 500 }
      ),
    };
  }

  const workflow = parsed.data as BaseWorkflow & z.infer<z.ZodObject<Extra>>;

  if (!workflow.is_active) {
    logger.error(`${context}: workflow inactive`, { workflowId: workflow.id });
    return {
      workflow: null,
      errorResponse: NextResponse.json(
        { error: 'Workflow inactive' },
        { status: 403 }
      ),
    };
  }

  return { workflow, errorResponse: null };
}
