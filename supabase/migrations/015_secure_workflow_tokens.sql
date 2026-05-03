-- Secure workflow tokens at rest.
--
-- Replaces the plaintext `token` column with two columns:
--   * `token_hash`      — HMAC-SHA256(token, ENCRYPTION_KEY), used for indexed lookup
--   * `token_encrypted` — AES-256-GCM(token, ENCRYPTION_KEY), used for outbound
--                         calls to n8n and admin display

DROP INDEX IF EXISTS idx_workflows_token;

ALTER TABLE public.workflows DROP COLUMN IF EXISTS token;

ALTER TABLE public.workflows ADD COLUMN token_hash TEXT NOT NULL;
ALTER TABLE public.workflows ADD COLUMN token_encrypted TEXT NOT NULL;

CREATE UNIQUE INDEX idx_workflows_token_hash ON public.workflows(token_hash);
