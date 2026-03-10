ALTER TABLE public.workflows
  ADD COLUMN token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE;

CREATE INDEX idx_workflows_token ON public.workflows(token);
