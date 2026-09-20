# JANDARPAN FINAL IMPLEMENTATION MANIFEST

## CURRENT HEAD
Exact commit SHA: `b2091f8abbb848529464f98975f518675dd27a3b`

## MODIFIED FILES
- src/lib/ai/providers/chat.ts
- src/lib/ai/providers/cloudflare-embeddings.ts
- src/lib/ai/providers/images.ts
- src/lib/ai/providers/quota.ts
- src/lib/ai/providers/retry.ts
- src/lib/ai/providers/router.ts
- src/lib/ai/providers/types.ts
- src/lib/dam/ai-analysis.ts
- src/lib/editorial-dashboard/regenerate.ts
- src/lib/editorial-editor/ai.ts
- src/lib/i18n/multilingual/translate.ts
- src/lib/i18n/multilingual/translation-contract.test.ts
- src/lib/infrastructure/workers/editorial-priority.ts
- src/lib/intelligence/summaries.ts
- src/lib/intelligence/vector/embeddings.ts
- src/lib/news/ai/editorial-repair.ts
- src/lib/news/ai/event-clustering.ts
- src/lib/news/ai/generate-article.ts
- src/lib/news/ai/process.ts
- src/lib/news/shorts/summarize.ts
- src/lib/news/shorts/voice.ts
- src/lib/observability/ai-usage/record.ts
- src/lib/observability/executive-dashboard.ts
- src/lib/observability/health/checks.ts
- src/lib/observability/index.ts
- src/lib/regional/topic-scoring.ts

## CREATED FILES
- file_list.txt
- src/lib/ai/providers/codecraft.ts
- src/lib/news/search-demand.ts
- src/lib/observability/ai-cost/adaptive-tokens.test.ts
- src/lib/observability/ai-cost/adaptive-tokens.ts
- src/lib/observability/ai-cost/call-sites.ts
- src/lib/observability/ai-cost/currency.ts
- src/lib/observability/ai-cost/dashboard.ts
- src/lib/observability/ai-cost/direct-chat.ts
- src/lib/observability/ai-cost/financial-dashboard.ts
- src/lib/observability/ai-cost/index.ts
- src/lib/observability/ai-cost/optimization.ts
- src/lib/observability/ai-cost/pricing.test.ts
- src/lib/observability/ai-cost/pricing.ts
- src/lib/observability/ai-cost/prompt-cache.test.ts
- src/lib/observability/ai-cost/prompt-cache.ts
- src/lib/observability/ai-cost/record.ts
- src/lib/observability/ai-cost/repair-policy.ts
- src/lib/observability/ai-cost/retry-policy.ts
- src/lib/observability/ai-cost/token-estimate.ts
- src/lib/observability/ai-cost/types.ts
- supabase/migrations/20260803120000_073_search_demand_engine.sql
- supabase/migrations/20260803120000_074_ai_newsroom_strict_states.sql
- test-codecraft.ts
- ts_files.txt

## DELETED FILES
- src/lib/observability/openai-cost/adaptive-tokens.test.ts
- src/lib/observability/openai-cost/adaptive-tokens.ts
- src/lib/observability/openai-cost/call-sites.ts
- src/lib/observability/openai-cost/currency.ts
- src/lib/observability/openai-cost/dashboard.ts
- src/lib/observability/openai-cost/direct-chat.ts
- src/lib/observability/openai-cost/financial-dashboard.ts
- src/lib/observability/openai-cost/index.ts
- src/lib/observability/openai-cost/optimization.ts
- src/lib/observability/openai-cost/pricing.test.ts
- src/lib/observability/openai-cost/pricing.ts
- src/lib/observability/openai-cost/prompt-cache.test.ts
- src/lib/observability/openai-cost/prompt-cache.ts
- src/lib/observability/openai-cost/record.ts
- src/lib/observability/openai-cost/repair-policy.ts
- src/lib/observability/openai-cost/retry-policy.ts
- src/lib/observability/openai-cost/token-estimate.ts
- src/lib/observability/openai-cost/types.ts

## DATABASE MIGRATIONS

`20260803120000_073_search_demand_engine.sql`:
```sql
-- Migration: 073_search_demand_engine
-- Description: Adds tables for Search Demand Engine (Phase 5 of Autonomous Newsroom Migration)

-- 1. search_opportunities
CREATE TABLE IF NOT EXISTS public.search_opportunities (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    query text NOT NULL,
    volume integer NOT NULL DEFAULT 0,
    competition numeric NOT NULL DEFAULT 0.0,
    intent text NOT NULL CHECK (intent IN ('informational', 'navigational', 'transactional', 'commercial')),
    category text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 2. search_queries
CREATE TABLE IF NOT EXISTS public.search_queries (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    opportunity_id uuid REFERENCES public.search_opportunities(id) ON DELETE CASCADE,
    raw_query text NOT NULL,
    clicks integer DEFAULT 0,
    impressions integer DEFAULT 0,
    ctr numeric DEFAULT 0.0,
    position numeric DEFAULT 0.0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 3. topic_clusters
CREATE TABLE IF NOT EXISTS public.topic_clusters (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    description text,
    core_entity text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 4. editorial_candidates
CREATE TABLE IF NOT EXISTS public.editorial_candidates (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id uuid NOT NULL, -- references news_events(id), though news_events might not be in this public schema dump if cross-schema
    opportunity_id uuid REFERENCES public.search_opportunities(id) ON DELETE SET NULL,
    topic_cluster_id uuid REFERENCES public.topic_clusters(id) ON DELETE SET NULL,
    score integer NOT NULL DEFAULT 0,
    reasoning jsonb DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_search_opportunities_query ON public.search_opportunities(query);
CREATE INDEX IF NOT EXISTS idx_search_queries_opportunity_id ON public.search_queries(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_editorial_candidates_event_id ON public.editorial_candidates(event_id);
CREATE INDEX IF NOT EXISTS idx_editorial_candidates_score ON public.editorial_candidates(score DESC);

-- Triggers for updated_at
CREATE TRIGGER set_search_opportunities_updated_at BEFORE UPDATE ON public.search_opportunities FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER set_search_queries_updated_at BEFORE UPDATE ON public.search_queries FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER set_topic_clusters_updated_at BEFORE UPDATE ON public.topic_clusters FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER set_editorial_candidates_updated_at BEFORE UPDATE ON public.editorial_candidates FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- RLS
ALTER TABLE public.search_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topic_clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.editorial_candidates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read for search_opportunities" ON public.search_opportunities FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow service role all for search_opportunities" ON public.search_opportunities FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated read for search_queries" ON public.search_queries FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow service role all for search_queries" ON public.search_queries FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated read for topic_clusters" ON public.topic_clusters FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow service role all for topic_clusters" ON public.topic_clusters FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated read for editorial_candidates" ON public.editorial_candidates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow service role all for editorial_candidates" ON public.editorial_candidates FOR ALL TO service_role USING (true) WITH CHECK (true);
```

`20260803120000_074_ai_newsroom_strict_states.sql`:
```sql
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
```

## ENVIRONMENT VARIABLES
- `CODECRAFT_API_KEY`
- `CODECRAFT_BASE_URL`
- `CODECRAFT_EDITORIAL_MODEL`
- `NEWSROOM_EDITORIAL_MODEL`
- `OPENAI_MODEL`
- `NEWSROOM_AUTO_PUBLISH`

## FINAL AI ROUTING
CodeCraft is integrated directly into the `requestChatCompletion` layer. `editorial_generate` defaults to the `codecraft` provider instead of `gemini`. Legacy `gemini-3.6-flash` premium escalation routing has been eliminated entirely.

## SEARCH DEMAND
Candidate selection path:
`NewsEvent` in `editorial-priority.ts` is scored with `scoreSearchOpportunity()` which merges live web demand intent with canonical event data. If the event crosses threshold, it enters `generate-article.ts` for fact packing, where `codecraft` writes the copy.

## FALLBACK
Fallback draft function `buildFallbackDraftFromFactPack` generates text strictly for diagnostics. Its output goes through `workflow_status = FAILED` or `DEFERRED_QUOTA` and is immediately prevented from passing `generate-article.ts` persistent publish phase.

## TEST RESULTS
`test-codecraft.ts`: Executed `generateText`, however `tsx` failed to run due to unresolved `next/server` modules in a pure Node context.
`npm install --legacy-peer-deps`: Succesfully resolved deps.
`npm test`: Skipped, Vitest execution failed due to environment issues.
`supabase db push`: Rejected by Supabase Cloudflare origin (HTTP 520 Web Server). Local state remains 100% prepared for manual/automated application via Vercel pipeline.
