-- Add company filter to chat sessions and trigger logs RPC functions

-- ============================================================
-- get_chat_sessions: add p_company_id parameter
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_chat_sessions(
  p_search        TEXT    DEFAULT '',
  p_workflow_id   UUID    DEFAULT NULL,
  p_workflow_ids  UUID[]  DEFAULT NULL,
  p_company_id    UUID    DEFAULT NULL,
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
SECURITY DEFINER
AS $$
DECLARE
  v_total BIGINT;
BEGIN
  SELECT COUNT(*) INTO v_total
  FROM (
    SELECT cl.session_id
    FROM public.chat_logs cl
    JOIN public.workflows w ON w.id = cl.workflow_id
    WHERE (p_search = '' OR cl.session_id ILIKE '%' || p_search || '%')
      AND (p_workflow_id IS NULL OR cl.workflow_id = p_workflow_id)
      AND (p_workflow_ids IS NULL OR cl.workflow_id = ANY(p_workflow_ids))
      AND (p_company_id IS NULL OR w.company_id = p_company_id)
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
    AND (p_company_id IS NULL OR w.company_id = p_company_id)
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
-- get_trigger_logs: add p_company_id parameter
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_trigger_logs(
  p_search      TEXT DEFAULT '',
  p_workflow_id UUID DEFAULT NULL,
  p_user_id     UUID DEFAULT NULL,
  p_company_id  UUID DEFAULT NULL,
  p_status      TEXT DEFAULT '',
  p_sort_field  TEXT DEFAULT 'created_at',
  p_sort_dir    TEXT DEFAULT 'desc',
  p_limit       INT DEFAULT 10,
  p_offset      INT DEFAULT 0
)
RETURNS TABLE (
  id            UUID,
  workflow_id   UUID,
  workflow_name TEXT,
  user_id       UUID,
  user_email    TEXT,
  status        TEXT,
  duration_ms   INTEGER,
  created_at    TIMESTAMPTZ,
  execution_id  TEXT,
  total_count   BIGINT
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_count BIGINT;
BEGIN
  SELECT COUNT(*)
    INTO v_count
  FROM public.trigger_logs t
  JOIN public.workflows w ON t.workflow_id = w.id
  JOIN public.profiles p ON t.user_id = p.id
  WHERE
    (p_workflow_id IS NULL OR t.workflow_id = p_workflow_id)
    AND (
      p_user_id IS NULL
      OR t.user_id = p_user_id
      OR EXISTS (
        SELECT 1 FROM public.user_companies uc
        JOIN public.workflows wf ON wf.company_id = uc.company_id
        WHERE uc.user_id = p_user_id AND wf.id = t.workflow_id
      )
    )
    AND (p_company_id IS NULL OR w.company_id = p_company_id)
    AND (p_status = '' OR t.status = p_status)
    AND (
      p_search = ''
      OR w.name ILIKE '%' || p_search || '%'
      OR p.email ILIKE '%' || p_search || '%'
      OR t.error_message ILIKE '%' || p_search || '%'
      OR t.execution_id ILIKE '%' || p_search || '%'
    );

  RETURN QUERY
  SELECT
    t.id,
    t.workflow_id,
    w.name AS workflow_name,
    t.user_id,
    p.email AS user_email,
    t.status,
    t.duration_ms,
    t.created_at,
    t.execution_id,
    v_count AS total_count
  FROM public.trigger_logs t
  JOIN public.workflows w ON t.workflow_id = w.id
  JOIN public.profiles p ON t.user_id = p.id
  WHERE
    (p_workflow_id IS NULL OR t.workflow_id = p_workflow_id)
    AND (
      p_user_id IS NULL
      OR t.user_id = p_user_id
      OR EXISTS (
        SELECT 1 FROM public.user_companies uc
        JOIN public.workflows wf ON wf.company_id = uc.company_id
        WHERE uc.user_id = p_user_id AND wf.id = t.workflow_id
      )
    )
    AND (p_company_id IS NULL OR w.company_id = p_company_id)
    AND (p_status = '' OR t.status = p_status)
    AND (
      p_search = ''
      OR w.name ILIKE '%' || p_search || '%'
      OR p.email ILIKE '%' || p_search || '%'
      OR t.error_message ILIKE '%' || p_search || '%'
      OR t.execution_id ILIKE '%' || p_search || '%'
    )
  ORDER BY
    CASE WHEN p_sort_field = 'workflow_name' AND p_sort_dir = 'asc' THEN w.name END ASC NULLS LAST,
    CASE WHEN p_sort_field = 'workflow_name' AND p_sort_dir = 'desc' THEN w.name END DESC NULLS LAST,
    CASE WHEN p_sort_field = 'user_email' AND p_sort_dir = 'asc' THEN p.email END ASC NULLS LAST,
    CASE WHEN p_sort_field = 'user_email' AND p_sort_dir = 'desc' THEN p.email END DESC NULLS LAST,
    CASE WHEN p_sort_field = 'status' AND p_sort_dir = 'asc' THEN t.status END ASC NULLS LAST,
    CASE WHEN p_sort_field = 'status' AND p_sort_dir = 'desc' THEN t.status END DESC NULLS LAST,
    CASE WHEN p_sort_field = 'duration_ms' AND p_sort_dir = 'asc' THEN t.duration_ms END ASC NULLS LAST,
    CASE WHEN p_sort_field = 'duration_ms' AND p_sort_dir = 'desc' THEN t.duration_ms END DESC NULLS LAST,
    CASE WHEN p_sort_field = 'created_at' AND p_sort_dir = 'asc' THEN t.created_at END ASC NULLS LAST,
    CASE WHEN p_sort_field = 'created_at' AND p_sort_dir = 'desc' THEN t.created_at END DESC NULLS LAST,
    t.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;
