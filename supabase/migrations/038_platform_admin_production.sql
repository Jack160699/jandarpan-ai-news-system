-- Platform admin production: config store, extended metadata, seed defaults

CREATE TABLE IF NOT EXISTS public.platform_config (
  config_key text PRIMARY KEY,
  config_value jsonb NOT NULL DEFAULT '{}'::jsonb,
  category text NOT NULL DEFAULT 'general',
  description text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_districts
  ADD COLUMN IF NOT EXISTS sections text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS homepage_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS editor_user_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS trend_score numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS article_count_cache int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.platform_topics
  ADD COLUMN IF NOT EXISTS seo_title text,
  ADD COLUMN IF NOT EXISTS seo_description text,
  ADD COLUMN IF NOT EXISTS content_types text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS trend_score numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS article_count_cache int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ai_keyword_suggestions text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.platform_article_sources
  ADD COLUMN IF NOT EXISTS source_id text UNIQUE,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS language text,
  ADD COLUMN IF NOT EXISTS region text,
  ADD COLUMN IF NOT EXISTS tier text,
  ADD COLUMN IF NOT EXISTS health_status text NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS failure_count int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS consecutive_failures int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_success_at timestamptz,
  ADD COLUMN IF NOT EXISTS reliability_score numeric NOT NULL DEFAULT 0.8,
  ADD COLUMN IF NOT EXISTS articles_fetched_24h int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_platform_sources_enabled
  ON public.platform_article_sources (enabled, reliability_score DESC);

CREATE INDEX IF NOT EXISTS idx_platform_topics_enabled
  ON public.platform_topics (enabled, trend_score DESC);

-- Homepage section toggles (replaces hardcoded DEFAULT_SECTION_CONFIG)
INSERT INTO public.platform_config (config_key, config_value, category, description)
VALUES (
  'homepage_sections',
  '[
    {"key":"breaking","enabled":true,"labelEn":"Breaking ticker","labelHi":"ब्रेकिंग टिकर"},
    {"key":"district_wire","enabled":true,"labelEn":"District Wire","labelHi":"जिला वायर"},
    {"key":"global_brief","enabled":true,"labelEn":"Global Brief","labelHi":"ग्लोबल ब्रीफ"},
    {"key":"explore_topics","enabled":true,"labelEn":"Explore Topics","labelHi":"विषय खोजें"},
    {"key":"topic_hubs","enabled":true,"labelEn":"Topic hubs","labelHi":"टॉपिक हब"}
  ]'::jsonb,
  'homepage',
  'Homepage section visibility toggles'
)
ON CONFLICT (config_key) DO NOTHING;

INSERT INTO public.platform_config (config_key, config_value, category, description)
VALUES (
  'newsroom_settings',
  '{"defaultLanguage":"hi","breakingThreshold":80,"trendingWindowHours":72}'::jsonb,
  'general',
  'Global newsroom runtime settings'
)
ON CONFLICT (config_key) DO NOTHING;

-- District hubs
INSERT INTO public.platform_districts (slug, name_en, name_hi, priority_tier, enabled, sections, metadata)
VALUES
  ('raipur', 'Raipur', 'रायपुर', 1, true, ARRAY['top','crime','politics','jobs','weather','alerts'], '{"desk":"state-capital"}'::jsonb),
  ('bilaspur', 'Bilaspur', 'बिलासपुर', 1, true, ARRAY['top','crime','politics','jobs','weather','alerts'], '{}'::jsonb),
  ('durg', 'Durg', 'दुर्ग', 2, true, ARRAY['top','crime','politics','jobs','weather','alerts'], '{}'::jsonb),
  ('raigarh', 'Raigarh', 'रायगढ़', 2, true, ARRAY['top','crime','politics','jobs','weather','alerts'], '{}'::jsonb),
  ('korba', 'Korba', 'कोरबा', 2, true, ARRAY['top','crime','politics','jobs','weather','alerts'], '{}'::jsonb),
  ('jagdalpur', 'Jagdalpur', 'जगदलपुर', 2, true, ARRAY['top','crime','politics','jobs','weather','alerts'], '{"region":"bastar"}'::jsonb)
ON CONFLICT (slug) DO UPDATE SET
  name_en = EXCLUDED.name_en,
  name_hi = EXCLUDED.name_hi,
  sections = EXCLUDED.sections;

-- Topic hubs
INSERT INTO public.platform_topics (slug, title_en, title_hi, description_en, description_hi, keywords, content_types)
VALUES
  ('jobs', 'Jobs & Careers', 'नौकरी और करियर', 'Government jobs, private vacancies, and career news for Chhattisgarh.', 'छत्तीसगढ़ के लिए सरकारी नौकरी और करियर खबरें।', ARRAY['CG jobs','sarkari naukri','रायपुर नौकरी'], ARRAY['jobs']),
  ('sports', 'Sports & Cricket', 'खेल और क्रिकेट', 'Cricket, IPL, and state sports coverage.', 'क्रिकेट, IPL और राज्य खेल कवरेज।', ARRAY['IPL','cricket Hindi','CG sports'], ARRAY['sports']),
  ('markets', 'Markets & Business', 'बाजार और व्यापार', 'Markets, business, and economic updates.', 'बाजार, व्यापार और आर्थिक अपडेट।', ARRAY['Nifty','Sensex','CG business'], ARRAY['markets']),
  ('district-news', 'District News', 'जिला समाचार', 'Hyperlocal coverage from every major CG district.', 'हर बड़े जिले की हाइपरलोकल कवरेज।', ARRAY['Raipur news','Bilaspur','Bastar'], ARRAY['district_news']),
  ('yojana', 'Sarkari Yojana', 'सरकारी योजना', 'Schemes, subsidies, and welfare updates.', 'योजना, सब्सिडी और लाभ अपडेट।', ARRAY['yojana CG','welfare scheme'], ARRAY['yojana']),
  ('fact-check', 'Fact Check', 'फैक्ट चेक', 'Verified reporting and misinformation debunks.', 'सत्यापित रिपोर्टिंग और गलत सूचना जाँच।', ARRAY['fact check','fake news'], ARRAY['fact_checks']),
  ('education', 'Education', 'शिक्षा', 'Board exams, scholarships, and school news.', 'बोर्ड परीक्षा, छात्रवृत्ति और स्कूल खबरें।', ARRAY['CG education','exam result'], ARRAY['education']),
  ('technology', 'Technology', 'टेक्नोलॉजी', 'AI, startups, and digital policy from India and CG.', 'AI, स्टार्टअप और डिजिटल नीति की खबरें।', ARRAY['tech news','AI India'], ARRAY['tech'])
ON CONFLICT (slug) DO UPDATE SET
  title_en = EXCLUDED.title_en,
  title_hi = EXCLUDED.title_hi,
  description_en = EXCLUDED.description_en,
  description_hi = EXCLUDED.description_hi,
  keywords = EXCLUDED.keywords,
  content_types = EXCLUDED.content_types;

ALTER TABLE public.platform_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS platform_config_public_read ON public.platform_config;
CREATE POLICY platform_config_public_read ON public.platform_config
  FOR SELECT USING (true);

COMMENT ON TABLE public.platform_config IS 'Database-backed newsroom configuration — editable via admin UI';
