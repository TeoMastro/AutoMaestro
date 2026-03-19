-- Migration: Prevent knowledge base on trigger workflows
-- Trigger workflows never query the knowledge base, so KB should always be false.

-- 1. Fix any existing trigger workflows that have KB enabled
UPDATE workflows
SET has_knowledge_base = false
WHERE type = 'trigger' AND has_knowledge_base = true;

-- 2. Add CHECK constraint to enforce this at the database level
ALTER TABLE workflows
ADD CONSTRAINT chk_trigger_no_kb
CHECK (type != 'trigger' OR has_knowledge_base = false);
