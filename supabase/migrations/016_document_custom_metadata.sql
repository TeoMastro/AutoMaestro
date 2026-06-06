-- 016_document_custom_metadata.sql
-- Adds free-form key/value metadata to documents. The values are merged into
-- every knowledge_base chunk's `metadata` JSONB at processing time, so they can
-- be used as filters via the /api/knowledge-search route, which passes the
-- request's `filter` object to the match_knowledge_base RPC (metadata @> filter).

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS custom_metadata JSONB NOT NULL DEFAULT '{}'::jsonb;
