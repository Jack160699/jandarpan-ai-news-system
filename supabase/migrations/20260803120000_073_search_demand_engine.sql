CREATE OR REPLACE FUNCTION public.update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';



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
DROP TRIGGER IF EXISTS set_search_opportunities_updated_at ON public.search_opportunities;
CREATE TRIGGER set_search_opportunities_updated_at BEFORE UPDATE ON public.search_opportunities FOR EACH ROW EXECUTE FUNCTION update_modified_column();
DROP TRIGGER IF EXISTS set_search_queries_updated_at ON public.search_queries;
CREATE TRIGGER set_search_queries_updated_at BEFORE UPDATE ON public.search_queries FOR EACH ROW EXECUTE FUNCTION update_modified_column();
DROP TRIGGER IF EXISTS set_topic_clusters_updated_at ON public.topic_clusters;
CREATE TRIGGER set_topic_clusters_updated_at BEFORE UPDATE ON public.topic_clusters FOR EACH ROW EXECUTE FUNCTION update_modified_column();
DROP TRIGGER IF EXISTS set_editorial_candidates_updated_at ON public.editorial_candidates;
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
