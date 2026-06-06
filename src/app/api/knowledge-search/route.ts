import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { validateWorkflowToken } from '@/lib/api/validate-workflow-token';
import logger from '@/lib/logger';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  const { workflow, errorResponse } = await validateWorkflowToken(
    req,
    'api/knowledge-search',
    z.object({ has_knowledge_base: z.boolean() })
  );
  if (errorResponse) return errorResponse;

  if (!workflow.has_knowledge_base) {
    logger.error('api/knowledge-search: no knowledge base', { workflowId: workflow.id });
    return NextResponse.json({ error: 'This workflow has no knowledge base' }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    logger.error('api/knowledge-search: invalid JSON body', { workflowId: workflow.id });
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { query, match_count, match_threshold, filter } = body;

  if (!query || typeof query !== 'string' || !query.trim()) {
    logger.error('api/knowledge-search: missing or invalid query', { workflowId: workflow.id });
    return NextResponse.json({ error: 'query is required and must be a non-empty string' }, { status: 400 });
  }

  const matchCount = typeof match_count === 'number' ? match_count : 10;
  const matchThreshold = typeof match_threshold === 'number' ? match_threshold : 0.5;

  // Optional metadata filter (JSONB containment, `metadata @> filter`). Accepts
  // any object — mirrors n8n's match_documents. `workflow_id` is dropped since
  // workflow scoping is already enforced server-side from the Bearer token.
  let metadataFilter: Record<string, unknown> = {};
  if (filter !== undefined && filter !== null) {
    if (typeof filter !== 'object' || Array.isArray(filter)) {
      logger.error('api/knowledge-search: invalid filter', { workflowId: workflow.id });
      return NextResponse.json({ error: 'filter must be a JSON object' }, { status: 400 });
    }
    metadataFilter = { ...(filter as Record<string, unknown>) };
    delete metadataFilter.workflow_id;
  }

  let embedding: number[];
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: query.trim(),
    });
    embedding = response.data[0].embedding;
  } catch (error) {
    logger.error('api/knowledge-search: embedding failed', {
      workflowId: workflow.id,
      error: (error as Error).message,
    });
    return NextResponse.json({ error: 'Failed to generate embedding' }, { status: 500 });
  }

  const supabase = createAdminClient();
  const { data: results, error: rpcError } = await supabase.rpc('match_knowledge_base', {
    query_embedding: embedding,
    workflow_id_filter: workflow.id,
    match_count: matchCount,
    match_threshold: matchThreshold,
    filter: metadataFilter,
  });

  if (rpcError) {
    logger.error('api/knowledge-search: vector search failed', {
      workflowId: workflow.id,
      error: rpcError.message,
    });
    return NextResponse.json({ error: 'Vector search failed' }, { status: 500 });
  }

  const formatted = (results ?? []).map((r: { content: string; metadata: Record<string, unknown> }) => ({
    type: 'text',
    text: JSON.stringify({ pageContent: r.content, metadata: r.metadata }),
  }));

  return NextResponse.json(formatted, { status: 200 });
}
