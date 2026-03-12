-- ============================================================
-- Migration 002: Add MANAGER role, rename USER → CLIENT
-- ============================================================

-- 1. Drop old CHECK constraint on role
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

-- 2. Rename existing USER rows to CLIENT (before adding new constraint)
UPDATE public.profiles SET role = 'CLIENT' WHERE role = 'USER';

-- 3. Add new CHECK constraint with 3 roles
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check CHECK (role IN ('CLIENT', 'MANAGER', 'ADMIN'));

-- 4. Change default to CLIENT
ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'CLIENT';

-- 5. Add is_manager() helper function
CREATE OR REPLACE FUNCTION public.is_manager()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'MANAGER'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- 6. Add is_admin_or_manager() helper function
CREATE OR REPLACE FUNCTION public.is_admin_or_manager()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'MANAGER')
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- 7. Add has_company_access() helper (bypasses RLS to avoid recursion)
CREATE OR REPLACE FUNCTION public.has_company_access(p_company_id UUID)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_companies
    WHERE user_id = auth.uid() AND company_id = p_company_id
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- 8. Add shares_company() helper (bypasses RLS to avoid recursion)
CREATE OR REPLACE FUNCTION public.shares_company(user_a UUID, user_b UUID)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_companies uc1
    JOIN public.user_companies uc2 ON uc1.company_id = uc2.company_id
    WHERE uc1.user_id = user_a AND uc2.user_id = user_b
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- ============================================================
-- 9. Update existing RLS policies to use SECURITY DEFINER helpers
--    (avoids infinite recursion on user_companies)
-- ============================================================

-- companies: replace inline user_companies lookups
DROP POLICY IF EXISTS "Users view assigned companies" ON public.companies;
CREATE POLICY "Clients view assigned companies" ON public.companies
  FOR SELECT USING (public.has_company_access(companies.id));

CREATE POLICY "Managers manage assigned companies" ON public.companies
  FOR ALL USING (
    public.is_manager()
    AND public.has_company_access(companies.id)
  );

-- user_companies: managers can manage assignments in their companies
CREATE POLICY "Managers manage own company assignments" ON public.user_companies
  FOR ALL USING (
    public.is_manager()
    AND public.has_company_access(user_companies.company_id)
  );

-- workflows: replace inline user_companies lookups
DROP POLICY IF EXISTS "Users view company workflows" ON public.workflows;
CREATE POLICY "Clients view company workflows" ON public.workflows
  FOR SELECT USING (public.has_company_access(workflows.company_id));

CREATE POLICY "Managers manage company workflows" ON public.workflows
  FOR ALL USING (
    public.is_manager()
    AND public.has_company_access(workflows.company_id)
  );

-- documents: replace inline user_companies joins
DROP POLICY IF EXISTS "Users manage assigned workflow documents" ON public.documents;
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

-- knowledge_base: replace inline user_companies joins
DROP POLICY IF EXISTS "Users view company workflow kb" ON public.knowledge_base;
CREATE POLICY "Clients view company workflow kb" ON public.knowledge_base
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.workflows w
      WHERE w.id = knowledge_base.workflow_id
        AND public.has_company_access(w.company_id)
    )
  );

CREATE POLICY "Managers view company kb" ON public.knowledge_base
  FOR SELECT USING (
    public.is_manager()
    AND EXISTS (
      SELECT 1 FROM public.workflows w
      WHERE w.id = knowledge_base.workflow_id
        AND public.has_company_access(w.company_id)
    )
  );

-- chat_logs: replace inline user_companies joins
CREATE POLICY "Managers view company chat_logs" ON public.chat_logs
  FOR SELECT USING (
    public.is_manager()
    AND EXISTS (
      SELECT 1 FROM public.workflows w
      WHERE w.id = chat_logs.workflow_id
        AND public.has_company_access(w.company_id)
    )
  );

-- trigger_logs: replace inline user_companies joins
CREATE POLICY "Managers view company trigger_logs" ON public.trigger_logs
  FOR SELECT USING (
    public.is_manager()
    AND EXISTS (
      SELECT 1 FROM public.workflows w
      WHERE w.id = trigger_logs.workflow_id
        AND public.has_company_access(w.company_id)
    )
  );

-- profiles: managers can view profiles of clients in their companies
CREATE POLICY "Managers view company client profiles" ON public.profiles
  FOR SELECT USING (
    public.is_manager()
    AND public.shares_company(auth.uid(), profiles.id)
  );
