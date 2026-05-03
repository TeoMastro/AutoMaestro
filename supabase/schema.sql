-- ============================================================
-- COMBINED DATABASE SCHEMA
-- Run this against a clean Supabase project after enabling
-- the pgvector extension in Dashboard > Database > Extensions.
--
-- Structure:
--   Part A: Extensions + helper functions
--   Part B: All CREATE TABLE statements (in FK order)
--   Part C: All indexes + triggers
--   Part D: All RLS policies
--   Part E: RPC functions
-- ============================================================


-- ============================================================
-- PART A: EXTENSIONS + HELPER FUNCTIONS
-- ============================================================

CREATE EXTENSION IF NOT EXISTS vector;

-- Auto-create profile on auth.users insert. Self-signup is disabled
-- at the app layer; admin server actions create users via the admin
-- API and immediately update the role/status as needed.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name, role)
  VALUES (
    NEW.id, NEW.email,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    'CLIENT'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-update updated_at (reused by many tables)
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- PART B: ALL TABLES (in foreign-key dependency order)
-- ============================================================

-- 1. profiles
CREATE TABLE public.profiles (
  id                      UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name              TEXT,
  last_name               TEXT,
  email                   TEXT        NOT NULL,
  role                    TEXT        NOT NULL DEFAULT 'CLIENT' CHECK (role IN ('CLIENT', 'MANAGER', 'ADMIN')),
  status                  TEXT        NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'UNVERIFIED')),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Helper: check admin role (must be after profiles table)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = (select auth.uid()) AND role = 'ADMIN'
  );
$$;

-- Helper: check manager role
CREATE OR REPLACE FUNCTION public.is_manager()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = (select auth.uid()) AND role = 'MANAGER'
  );
$$;

-- Helper: check admin or manager role
CREATE OR REPLACE FUNCTION public.is_admin_or_manager()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = (select auth.uid()) AND role IN ('ADMIN', 'MANAGER')
  );
$$;


-- 2. companies
CREATE TABLE public.companies (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT        NOT NULL,
  note         TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. user_companies (user ↔ company assignment)
CREATE TABLE public.user_companies (
  user_id     UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  company_id  UUID        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  assigned_by UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  PRIMARY KEY (user_id, company_id)
);

-- 4. workflows (belongs to one company)
CREATE TABLE public.workflows (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash         TEXT        NOT NULL,
  token_encrypted    TEXT        NOT NULL,
  company_id         UUID        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name               TEXT        NOT NULL,
  description        TEXT,
  type               TEXT        NOT NULL DEFAULT 'chat'
                                 CHECK (type IN ('chat', 'trigger')),
  webhook_url        TEXT        NOT NULL,
  has_knowledge_base BOOLEAN     NOT NULL DEFAULT false,
  config             JSONB       NOT NULL DEFAULT '{}',
  is_active          BOOLEAN     NOT NULL DEFAULT true,
  created_by         UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4b. template_library (shared n8n templates)
CREATE TABLE public.template_library (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT        NOT NULL,
  description   TEXT,
  setup_guide   TEXT,
  workflow_json JSONB       NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. documents
CREATE TABLE public.documents (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id     UUID        NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  uploaded_by     UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name            TEXT        NOT NULL,
  file_type       TEXT        NOT NULL CHECK (file_type IN ('pdf', 'txt', 'docx', 'md')),
  storage_path    TEXT        NOT NULL,
  file_size_bytes BIGINT,
  status          TEXT        NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending', 'processing', 'ready', 'error')),
  error_message   TEXT,
  chunk_count     INTEGER,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. knowledge_base (partitioned by workflow_id)
CREATE TABLE public.knowledge_base (
  id          BIGINT      GENERATED ALWAYS AS IDENTITY,
  content     TEXT        NOT NULL,
  metadata    JSONB       DEFAULT '{}'::jsonb,
  embedding   VECTOR(1536),
  workflow_id UUID        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  doc_id      TEXT        GENERATED ALWAYS AS (metadata->>'doc_id') STORED,
  PRIMARY KEY (workflow_id, id)
) PARTITION BY LIST (workflow_id);
-- Partitions + HNSW indexes are created dynamically by the application.

-- 7. chat_logs
CREATE TABLE public.chat_logs (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id   UUID        NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  session_id    TEXT        NOT NULL,
  human_message TEXT        NOT NULL,
  ai_response   TEXT        NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 8. trigger_logs
CREATE TABLE public.trigger_logs (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id     UUID        NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  user_id         UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status          TEXT        NOT NULL CHECK (status IN ('success', 'error')),
  request_params  JSONB       DEFAULT '{}'::jsonb,
  response_data   JSONB       DEFAULT '{}'::jsonb,
  error_message   TEXT,
  duration_ms     INTEGER     NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  execution_id    TEXT,
  CONSTRAINT trigger_logs_execution_id_unique UNIQUE (execution_id)
);


-- ============================================================
-- PART C: INDEXES + TRIGGERS
-- ============================================================

-- profiles
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- companies
CREATE TRIGGER companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- user_companies
CREATE INDEX idx_user_companies_user_id    ON public.user_companies(user_id);
CREATE INDEX idx_user_companies_company_id ON public.user_companies(company_id);

-- workflows
CREATE INDEX idx_workflows_company_id ON public.workflows(company_id);
CREATE UNIQUE INDEX idx_workflows_token_hash ON public.workflows(token_hash);
CREATE TRIGGER workflows_updated_at
  BEFORE UPDATE ON public.workflows
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- template_library
CREATE INDEX idx_template_library_title ON public.template_library(title);
CREATE INDEX idx_template_library_created_at ON public.template_library(created_at);
CREATE TRIGGER template_library_updated_at
  BEFORE UPDATE ON public.template_library
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- documents
CREATE INDEX idx_documents_workflow_id ON public.documents(workflow_id);
CREATE INDEX idx_documents_uploaded_by ON public.documents(uploaded_by);
CREATE INDEX idx_documents_status      ON public.documents(status);
CREATE TRIGGER documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- chat_logs
CREATE INDEX idx_chat_logs_workflow_id ON public.chat_logs(workflow_id);
CREATE INDEX idx_chat_logs_session_id  ON public.chat_logs(session_id);

-- trigger_logs
CREATE INDEX idx_trigger_logs_workflow_id ON public.trigger_logs(workflow_id);
CREATE INDEX idx_trigger_logs_user_id     ON public.trigger_logs(user_id);
CREATE INDEX idx_trigger_logs_created_at  ON public.trigger_logs(created_at);
CREATE INDEX idx_trigger_logs_status      ON public.trigger_logs(status);


-- Helper: check if current user has access to a company (bypasses RLS to avoid recursion)
CREATE OR REPLACE FUNCTION public.has_company_access(p_company_id UUID)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_companies
    WHERE user_id = (select auth.uid()) AND company_id = p_company_id
  );
$$;

-- Helper: check if two users share at least one company (bypasses RLS to avoid recursion)
CREATE OR REPLACE FUNCTION public.shares_company(user_a UUID, user_b UUID)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_companies uc1
    JOIN public.user_companies uc2 ON uc1.company_id = uc2.company_id
    WHERE uc1.user_id = user_a AND uc2.user_id = user_b
  );
$$;

-- ============================================================
-- PART D: ROW LEVEL SECURITY (all tables exist, safe to cross-reference)
-- ============================================================

-- profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile"   ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles"   ON public.profiles FOR SELECT USING (public.is_admin());
CREATE POLICY "Admins can update all profiles" ON public.profiles FOR UPDATE USING (public.is_admin());
CREATE POLICY "Admins can delete profiles"     ON public.profiles FOR DELETE USING (public.is_admin());
CREATE POLICY "Admins can insert profiles"     ON public.profiles FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Managers view company client profiles" ON public.profiles
  FOR SELECT USING (
    public.is_manager()
    AND public.shares_company(auth.uid(), profiles.id)
  );

-- companies
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage companies" ON public.companies
  FOR ALL USING (public.is_admin());
CREATE POLICY "Clients view assigned companies" ON public.companies
  FOR SELECT USING (public.has_company_access(companies.id));
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

-- user_companies
ALTER TABLE public.user_companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage user_companies" ON public.user_companies
  FOR ALL USING (public.is_admin());
CREATE POLICY "Users view own company assignments" ON public.user_companies
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Managers manage own company assignments" ON public.user_companies
  FOR ALL USING (
    public.is_manager()
    AND public.has_company_access(user_companies.company_id)
  );

-- workflows
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage workflows" ON public.workflows
  FOR ALL USING (public.is_admin());
CREATE POLICY "Clients view company workflows" ON public.workflows
  FOR SELECT USING (public.has_company_access(workflows.company_id));
CREATE POLICY "Managers manage company workflows" ON public.workflows
  FOR ALL USING (
    public.is_manager()
    AND public.has_company_access(workflows.company_id)
  );

-- template_library
ALTER TABLE public.template_library ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage template_library" ON public.template_library
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Managers view template_library" ON public.template_library
  FOR SELECT USING (public.is_admin_or_manager());

-- documents
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage documents" ON public.documents
  FOR ALL USING (public.is_admin());
CREATE POLICY "Clients manage assigned workflow documents" ON public.documents
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.workflows w
      WHERE w.id = documents.workflow_id
        AND public.has_company_access(w.company_id)
    )
  );
CREATE POLICY "Managers manage company documents" ON public.documents
  FOR ALL USING (
    public.is_manager()
    AND EXISTS (
      SELECT 1 FROM public.workflows w
      WHERE w.id = documents.workflow_id
        AND public.has_company_access(w.company_id)
    )
  );

-- knowledge_base
ALTER TABLE public.knowledge_base ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage knowledge_base" ON public.knowledge_base
  FOR ALL USING (public.is_admin());
CREATE POLICY "Clients view company workflow kb" ON public.knowledge_base
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.workflows w
      WHERE w.id = knowledge_base.workflow_id
        AND public.has_company_access(w.company_id)
    )
  );
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

-- chat_logs
ALTER TABLE public.chat_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view all chat_logs" ON public.chat_logs
  FOR SELECT TO authenticated
  USING (public.is_admin());
CREATE POLICY "Clients view company chat_logs" ON public.chat_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.workflows w
      WHERE w.id = chat_logs.workflow_id
        AND public.has_company_access(w.company_id)
    )
  );
CREATE POLICY "Managers view company chat_logs" ON public.chat_logs
  FOR SELECT USING (
    public.is_manager()
    AND EXISTS (
      SELECT 1 FROM public.workflows w
      WHERE w.id = chat_logs.workflow_id
        AND public.has_company_access(w.company_id)
    )
  );

-- trigger_logs
ALTER TABLE public.trigger_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view all trigger_logs" ON public.trigger_logs
  FOR SELECT USING (public.is_admin());
CREATE POLICY "Managers view company trigger_logs" ON public.trigger_logs
  FOR SELECT USING (
    public.is_manager()
    AND EXISTS (
      SELECT 1 FROM public.workflows w
      WHERE w.id = trigger_logs.workflow_id
        AND public.has_company_access(w.company_id)
    )
  );
CREATE POLICY "Clients view assigned trigger_logs" ON public.trigger_logs
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.workflows w
      JOIN public.user_companies uc ON uc.company_id = w.company_id
      WHERE w.id = trigger_logs.workflow_id
        AND uc.user_id = auth.uid()
    )
  );


-- ============================================================
-- PART E: RPC FUNCTIONS
-- ============================================================

-- Vector search
CREATE OR REPLACE FUNCTION public.match_knowledge_base(
  query_embedding    VECTOR(1536),
  workflow_id_filter UUID,
  match_count        INTEGER DEFAULT 5,
  match_threshold    FLOAT   DEFAULT 0.7,
  filter             JSONB   DEFAULT '{}'
)
RETURNS TABLE (id BIGINT, content TEXT, metadata JSONB, similarity FLOAT)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT kb.id, kb.content, kb.metadata,
         1 - (kb.embedding <=> query_embedding) AS similarity
  FROM public.knowledge_base kb
  WHERE kb.workflow_id = workflow_id_filter
    AND kb.embedding IS NOT NULL
    AND (filter = '{}' OR kb.metadata @> filter)
    AND 1 - (kb.embedding <=> query_embedding) > match_threshold
  ORDER BY kb.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Chat sessions aggregation
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

-- Trigger logs with pagination
CREATE OR REPLACE FUNCTION public.get_trigger_logs(
  p_search      TEXT DEFAULT '',
  p_workflow_id UUID DEFAULT NULL,
  p_user_id     UUID DEFAULT NULL,
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


-- ============================================================
-- 12. Helper RPC: exec_sql (for dynamic DDL like KB partitions)
-- ============================================================

CREATE OR REPLACE FUNCTION public.exec_sql(sql TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql;
END;
$$;

-- Lock down exec_sql: only service_role (admin client) may invoke it.
REVOKE EXECUTE ON FUNCTION public.exec_sql(TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.exec_sql(TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.exec_sql(TEXT) FROM authenticated;


-- ============================================================
-- Storage policies — workflow-documents bucket
-- Path format: {workflow_id}/{user_id}/{timestamp}_{filename}
-- ============================================================

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
-- 13. The match_documents function
-- ============================================================
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(1536),
  filter jsonb DEFAULT '{}',
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id bigint,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
DECLARE
  wf_id uuid;
  meta_filter jsonb;
BEGIN
  -- Extract workflow_id for partition pruning
  wf_id := (filter ->> 'workflow_id')::uuid;
  
  -- Remove workflow_id from filter so the metadata @> check works
  meta_filter := filter - 'workflow_id';

  RETURN QUERY
  SELECT kb.id, kb.content, kb.metadata,
         1 - (kb.embedding <=> query_embedding) AS similarity
  FROM public.knowledge_base kb
  WHERE kb.embedding IS NOT NULL
    AND (wf_id IS NULL OR kb.workflow_id = wf_id)
    AND (meta_filter = '{}' OR kb.metadata @> meta_filter)
  ORDER BY kb.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
