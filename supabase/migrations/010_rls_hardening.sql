-- ============================================================
-- Migration 010: RLS Hardening
-- ============================================================
-- Closes the holes surfaced by the RLS audit:
--   1. get_chat_sessions cross-tenant read (remove SECURITY DEFINER)
--   2. exec_sql privilege lockdown
--   3. workflow-documents storage bucket policies
--   4. Companies — managers: split FOR ALL into SELECT/UPDATE/DELETE
--   5. Knowledge base — managers: SELECT-only → FOR ALL
--   6. chat_logs — admins: FOR ALL → SELECT only
--   7. Mark helper functions STABLE for planner inlining
-- ============================================================


-- ============================================================
-- 7. Helper functions — mark STABLE so the planner can inline them
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = (select auth.uid()) AND role = 'ADMIN'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_manager()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = (select auth.uid()) AND role = 'MANAGER'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_manager()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = (select auth.uid()) AND role IN ('ADMIN', 'MANAGER')
  );
$$;

CREATE OR REPLACE FUNCTION public.has_company_access(p_company_id UUID)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_companies
    WHERE user_id = (select auth.uid()) AND company_id = p_company_id
  );
$$;

CREATE OR REPLACE FUNCTION public.shares_company(user_a UUID, user_b UUID)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_companies uc1
    JOIN public.user_companies uc2 ON uc1.company_id = uc2.company_id
    WHERE uc1.user_id = user_a AND uc2.user_id = user_b
  );
$$;


-- ============================================================
-- 1. get_chat_sessions — drop SECURITY DEFINER so RLS applies
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_chat_sessions(
  p_search        TEXT    DEFAULT '',
  p_workflow_id   UUID    DEFAULT NULL,
  p_workflow_ids  UUID[]  DEFAULT NULL,
  p_sort_field    TEXT    DEFAULT 'last_message_at',
  p_sort_dir      TEXT    DEFAULT 'desc',
  p_limit         INTEGER DEFAULT 10,
  p_offset        INTEGER DEFAULT 0
)
RETURNS TABLE (
  session_id       TEXT,
  workflow_id      UUID,
  workflow_name    TEXT,
  message_count    BIGINT,
  first_message_at TIMESTAMPTZ,
  last_message_at  TIMESTAMPTZ,
  total_count      BIGINT
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_total BIGINT;
BEGIN
  SELECT COUNT(*) INTO v_total
  FROM (
    SELECT cl.session_id
    FROM public.chat_logs cl
    WHERE (p_search = '' OR cl.session_id ILIKE '%' || p_search || '%')
      AND (p_workflow_id IS NULL OR cl.workflow_id = p_workflow_id)
      AND (p_workflow_ids IS NULL OR cl.workflow_id = ANY(p_workflow_ids))
    GROUP BY cl.session_id
  ) sub;

  RETURN QUERY
  SELECT
    cl.session_id,
    cl.workflow_id,
    w.name AS workflow_name,
    COUNT(*)::BIGINT AS message_count,
    MIN(cl.created_at) AS first_message_at,
    MAX(cl.created_at) AS last_message_at,
    v_total AS total_count
  FROM public.chat_logs cl
  JOIN public.workflows w ON w.id = cl.workflow_id
  WHERE (p_search = '' OR cl.session_id ILIKE '%' || p_search || '%')
    AND (p_workflow_id IS NULL OR cl.workflow_id = p_workflow_id)
    AND (p_workflow_ids IS NULL OR cl.workflow_id = ANY(p_workflow_ids))
  GROUP BY cl.session_id, cl.workflow_id, w.name
  ORDER BY
    CASE WHEN p_sort_field = 'last_message_at'  AND p_sort_dir = 'desc' THEN MAX(cl.created_at) END DESC NULLS LAST,
    CASE WHEN p_sort_field = 'last_message_at'  AND p_sort_dir = 'asc'  THEN MAX(cl.created_at) END ASC  NULLS LAST,
    CASE WHEN p_sort_field = 'first_message_at' AND p_sort_dir = 'desc' THEN MIN(cl.created_at) END DESC NULLS LAST,
    CASE WHEN p_sort_field = 'first_message_at' AND p_sort_dir = 'asc'  THEN MIN(cl.created_at) END ASC  NULLS LAST,
    CASE WHEN p_sort_field = 'message_count'    AND p_sort_dir = 'desc' THEN COUNT(*) END DESC NULLS LAST,
    CASE WHEN p_sort_field = 'message_count'    AND p_sort_dir = 'asc'  THEN COUNT(*) END ASC  NULLS LAST,
    CASE WHEN p_sort_field = 'workflow_name'    AND p_sort_dir = 'desc' THEN w.name END DESC NULLS LAST,
    CASE WHEN p_sort_field = 'workflow_name'    AND p_sort_dir = 'asc'  THEN w.name END ASC  NULLS LAST,
    MAX(cl.created_at) DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;


-- ============================================================
-- 2. exec_sql — revoke from public / authenticated / anon
-- ============================================================

REVOKE EXECUTE ON FUNCTION public.exec_sql(TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.exec_sql(TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.exec_sql(TEXT) FROM authenticated;


-- ============================================================
-- 3. Storage policies — workflow-documents bucket
-- ------------------------------------------------------------
-- Path format: {workflow_id}/{user_id}/{timestamp}_{filename}
-- First folder segment is the workflow_id.
-- ============================================================

DROP POLICY IF EXISTS "workflow-documents read" ON storage.objects;
CREATE POLICY "workflow-documents read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'workflow-documents'
    AND (
      public.is_admin()
      OR EXISTS (
        SELECT 1 FROM public.workflows w
        WHERE w.id = ((storage.foldername(name))[1])::uuid
          AND public.has_company_access(w.company_id)
      )
    )
  );

DROP POLICY IF EXISTS "workflow-documents write" ON storage.objects;
CREATE POLICY "workflow-documents write" ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'workflow-documents'
    AND (
      public.is_admin()
      OR EXISTS (
        SELECT 1 FROM public.workflows w
        WHERE w.id = ((storage.foldername(name))[1])::uuid
          AND public.has_company_access(w.company_id)
      )
    )
  )
  WITH CHECK (
    bucket_id = 'workflow-documents'
    AND (
      public.is_admin()
      OR EXISTS (
        SELECT 1 FROM public.workflows w
        WHERE w.id = ((storage.foldername(name))[1])::uuid
          AND public.has_company_access(w.company_id)
      )
    )
  );


-- ============================================================
-- 4. companies — split manager FOR ALL into SELECT/UPDATE/DELETE
-- ============================================================

DROP POLICY IF EXISTS "Managers manage assigned companies" ON public.companies;

CREATE POLICY "Managers view assigned companies" ON public.companies
  FOR SELECT TO authenticated
  USING (public.is_manager() AND public.has_company_access(companies.id));

CREATE POLICY "Managers update assigned companies" ON public.companies
  FOR UPDATE TO authenticated
  USING (public.is_manager() AND public.has_company_access(companies.id))
  WITH CHECK (public.is_manager() AND public.has_company_access(companies.id));

CREATE POLICY "Managers delete assigned companies" ON public.companies
  FOR DELETE TO authenticated
  USING (public.is_manager() AND public.has_company_access(companies.id));


-- ============================================================
-- 5. knowledge_base — managers get full access
-- ============================================================

DROP POLICY IF EXISTS "Managers view company kb" ON public.knowledge_base;
DROP POLICY IF EXISTS "Managers manage company kb" ON public.knowledge_base;

CREATE POLICY "Managers manage company kb" ON public.knowledge_base
  FOR ALL TO authenticated
  USING (
    public.is_manager()
    AND EXISTS (
      SELECT 1 FROM public.workflows w
      WHERE w.id = knowledge_base.workflow_id
        AND public.has_company_access(w.company_id)
    )
  )
  WITH CHECK (
    public.is_manager()
    AND EXISTS (
      SELECT 1 FROM public.workflows w
      WHERE w.id = knowledge_base.workflow_id
        AND public.has_company_access(w.company_id)
    )
  );


-- ============================================================
-- 6. chat_logs — admins SELECT only (no DELETE)
-- ============================================================

DROP POLICY IF EXISTS "Admins manage chat_logs" ON public.chat_logs;
DROP POLICY IF EXISTS "Admins view all chat_logs" ON public.chat_logs;

CREATE POLICY "Admins view all chat_logs" ON public.chat_logs
  FOR SELECT TO authenticated
  USING (public.is_admin());
