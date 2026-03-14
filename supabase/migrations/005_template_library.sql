-- ============================================================
-- Template Library
-- ============================================================

CREATE TABLE public.template_library (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT        NOT NULL,
  description   TEXT,
  workflow_json JSONB       NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_template_library_title ON public.template_library(title);
CREATE INDEX idx_template_library_created_at ON public.template_library(created_at);

CREATE TRIGGER template_library_updated_at
  BEFORE UPDATE ON public.template_library
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.template_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage template_library" ON public.template_library
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Managers view template_library" ON public.template_library
  FOR SELECT USING (public.is_admin_or_manager());
