-- Comprehensive Ingestion Funnel Audit
-- Exact counts across all stages

SELECT '1. INGESTED (news_articles)' AS stage,
       count(*) AS total_all_time,
       count(*) FILTER (WHERE created_at >= now() - interval '30 days') AS last_30_days,
       count(*) FILTER (WHERE created_at >= now() - interval '7 days') AS last_7_days,
       count(*) FILTER (WHERE created_at >= now() - interval '24 hours') AS last_24_hours
FROM news_articles

UNION ALL

SELECT '2. VALIDATED SIGNALS (news_signals)' AS stage,
       count(*) AS total_all_time,
       count(*) FILTER (WHERE created_at >= now() - interval '30 days') AS last_30_days,
       count(*) FILTER (WHERE created_at >= now() - interval '7 days') AS last_7_days,
       count(*) FILTER (WHERE created_at >= now() - interval '24 hours') AS last_24_hours
FROM news_signals

UNION ALL

SELECT '3. EDITORIAL EVENTS (news_events)' AS stage,
       count(*) AS total_all_time,
       count(*) FILTER (WHERE created_at >= now() - interval '30 days') AS last_30_days,
       count(*) FILTER (WHERE created_at >= now() - interval '7 days') AS last_7_days,
       count(*) FILTER (WHERE created_at >= now() - interval '24 hours') AS last_24_hours
FROM news_events

UNION ALL

SELECT '4. GENERATED TOTAL (generated_articles)' AS stage,
       count(*) AS total_all_time,
       count(*) FILTER (WHERE created_at >= now() - interval '30 days') AS last_30_days,
       count(*) FILTER (WHERE created_at >= now() - interval '7 days') AS last_7_days,
       count(*) FILTER (WHERE created_at >= now() - interval '24 hours') AS last_24_hours
FROM generated_articles

UNION ALL

SELECT '5. PUBLISHED (editorial_status in approved/published/live)' AS stage,
       count(*) AS total_all_time,
       count(*) FILTER (WHERE published_at >= now() - interval '30 days') AS last_30_days,
       count(*) FILTER (WHERE published_at >= now() - interval '7 days') AS last_7_days,
       count(*) FILTER (WHERE published_at >= now() - interval '24 hours') AS last_24_hours
FROM generated_articles
WHERE editorial_status IN ('approved', 'published', 'live')
  AND published_at IS NOT NULL

UNION ALL

SELECT '6. MEDIA VALID (real news media, not unsplash/stock)' AS stage,
       count(*) AS total_all_time,
       count(*) FILTER (WHERE published_at >= now() - interval '30 days') AS last_30_days,
       count(*) FILTER (WHERE published_at >= now() - interval '7 days') AS last_7_days,
       count(*) FILTER (WHERE published_at >= now() - interval '24 hours') AS last_24_hours
FROM generated_articles
WHERE editorial_status IN ('approved', 'published', 'live')
  AND published_at IS NOT NULL
  AND hero_image_url IS NOT NULL
  AND hero_image_url NOT ILIKE '%unsplash%'
  AND hero_image_url NOT ILIKE '%placeholder%'
  AND hero_image_url NOT ILIKE '%googleusercontent.com/j6_cofbogxh%'
  AND hero_image_url NOT ILIKE '%default.jpg%';
