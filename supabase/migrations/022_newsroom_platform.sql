-- Jan Darpan modular newsroom platform tables (architecture prep)
-- Wire application reads when ready; mock data used until then.

CREATE TABLE IF NOT EXISTS public.platform_districts (
  slug text PRIMARY KEY,
  name_en text NOT NULL,
  name_hi text NOT NULL,
  priority_tier int NOT NULL DEFAULT 2,
  enabled boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.platform_topics (
  slug text PRIMARY KEY,
  title_en text NOT NULL,
  title_hi text NOT NULL,
  description_en text,
  description_hi text,
  keywords text[] NOT NULL DEFAULT '{}',
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.platform_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  excerpt text,
  content text,
  image_url text,
  category text NOT NULL,
  tags text[] NOT NULL DEFAULT '{}',
  district_slug text REFERENCES public.platform_districts(slug),
  language text NOT NULL DEFAULT 'en',
  source_name text,
  published_at timestamptz NOT NULL DEFAULT now(),
  priority int NOT NULL DEFAULT 50,
  is_breaking boolean NOT NULL DEFAULT false,
  seo_title text,
  seo_description text,
  seo_keywords text[],
  ai_summary text,
  views int NOT NULL DEFAULT 0,
  trending_score numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.platform_breaking_news (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid REFERENCES public.platform_articles(id) ON DELETE SET NULL,
  headline text NOT NULL,
  slug text,
  priority int NOT NULL DEFAULT 80,
  expires_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.platform_article_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  url text,
  enabled boolean NOT NULL DEFAULT true,
  trust_score numeric NOT NULL DEFAULT 0.8,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.platform_ai_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid REFERENCES public.platform_articles(id) ON DELETE SET NULL,
  job_type text NOT NULL,
  status text NOT NULL DEFAULT 'queued',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  result jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_platform_articles_category ON public.platform_articles(category);
CREATE INDEX IF NOT EXISTS idx_platform_articles_district ON public.platform_articles(district_slug);
CREATE INDEX IF NOT EXISTS idx_platform_articles_published ON public.platform_articles(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_breaking_active ON public.platform_breaking_news(is_active, priority DESC);

ALTER TABLE public.platform_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_districts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_breaking_news ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_article_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_ai_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY platform_articles_public_read ON public.platform_articles
  FOR SELECT USING (true);

CREATE POLICY platform_districts_public_read ON public.platform_districts
  FOR SELECT USING (enabled = true);

CREATE POLICY platform_topics_public_read ON public.platform_topics
  FOR SELECT USING (enabled = true);

CREATE POLICY platform_breaking_public_read ON public.platform_breaking_news
  FOR SELECT USING (is_active = true);
