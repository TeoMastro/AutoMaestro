-- ============================================================
-- Migration 011: Enable RLS on every existing knowledge_base partition
-- ============================================================
-- Partitions do not inherit the parent table's RLS flag. Any caller that
-- queries a partition directly by name (e.g. knowledge_base_wf_<uuid>)
-- bypasses the parent's RLS policies unless RLS is enabled on the partition
-- itself. This migration backfills RLS on existing partitions; new partitions
-- created via workflow.ts already enable RLS inline.
--
-- We use FORCE ROW LEVEL SECURITY so that table owners (i.e. the postgres
-- role used by the Supabase SQL editor) are also subject to the policies.
-- The service_role used by createAdminClient() bypasses RLS via the
-- BYPASSRLS attribute, so the admin client continues to work unchanged.
-- ============================================================

DO $$
DECLARE
  partition_name TEXT;
BEGIN
  FOR partition_name IN
    SELECT c.relname
    FROM pg_inherits i
    JOIN pg_class c ON c.oid = i.inhrelid
    JOIN pg_class p ON p.oid = i.inhparent
    JOIN pg_namespace n ON n.oid = p.relnamespace
    WHERE p.relname = 'knowledge_base'
      AND n.nspname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', partition_name);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', partition_name);
  END LOOP;
END $$;
