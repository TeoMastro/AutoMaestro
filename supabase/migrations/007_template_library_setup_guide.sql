-- ============================================================
-- Add setup_guide to template_library
-- ============================================================

ALTER TABLE public.template_library
ADD COLUMN IF NOT EXISTS setup_guide TEXT;
