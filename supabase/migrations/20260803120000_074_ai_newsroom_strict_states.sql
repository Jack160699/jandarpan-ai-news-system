-- Migration: 074_ai_newsroom_strict_states
-- Description: Modifies generated_articles workflow_status to track strict AI states (Phase 5)

-- Drop existing constraint
ALTER TABLE public.generated_articles
  DROP CONSTRAINT IF EXISTS generated_articles_workflow_status_check;

-- Add new constraint with strict AI states
ALTER TABLE public.generated_articles
  ADD CONSTRAINT generated_articles_workflow_status_check
  CHECK (
    workflow_status IN (
      'draft', 
      'review', 
      'fact_check', 
      'legal_review', 
      'scheduled', 
      'published', 
      'archived',
      -- New strict AI states
      'DEFERRED_QUOTA',
      'FAILED',
      'PUBLISH_READY'
    )
  );
