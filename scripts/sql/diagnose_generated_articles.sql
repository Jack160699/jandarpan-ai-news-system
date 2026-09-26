-- Diagnostic breakdown of all 62 generated_articles rows
SELECT
  editorial_status,
  workflow_status,
  count(*) AS count,
  count(*) FILTER (WHERE hero_image_url IS NULL) AS no_image,
  count(*) FILTER (WHERE hero_image_url ILIKE '%unsplash%' OR hero_image_url ILIKE '%placeholder%') AS unsplash_stock_image,
  count(*) FILTER (WHERE hero_image_url NOT ILIKE '%unsplash%' AND hero_image_url NOT ILIKE '%placeholder%' AND hero_image_url IS NOT NULL) AS real_source_image
FROM generated_articles
GROUP BY editorial_status, workflow_status;

-- Breakdown of why articles are rejected or accepted
SELECT
  CASE
    WHEN editorial_status NOT IN ('approved', 'published', 'live') OR published_at IS NULL THEN '1. not_published'
    WHEN published_at < now() - interval '30 days' THEN '2. older_than_30_days'
    WHEN hero_image_url IS NULL THEN '3. no_image'
    WHEN hero_image_url ILIKE '%unsplash%' OR hero_image_url ILIKE '%placeholder%' OR hero_image_url ILIKE '%googleusercontent.com/j6_cofbogxh%' THEN '4. stock_or_placeholder_image'
    ELSE '5. PASSES_ALL_CRITERIA (real news media + published)'
  END AS funnel_category,
  count(*) AS count
FROM generated_articles
GROUP BY 1
ORDER BY 1;
