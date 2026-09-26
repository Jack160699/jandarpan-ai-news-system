-- Check if the 45 generated articles with stock images have real images in their underlying signals
SELECT
  g.id AS article_id,
  g.headline,
  g.hero_image_url AS current_stock_hero,
  g.event_id,
  count(s.id) AS signal_count,
  count(s.id) FILTER (WHERE s.image_url IS NOT NULL AND s.image_url NOT ILIKE '%unsplash%' AND s.image_url NOT ILIKE '%placeholder%' AND length(trim(s.image_url)) > 0) AS real_signal_images,
  max(s.image_url) FILTER (WHERE s.image_url IS NOT NULL AND s.image_url NOT ILIKE '%unsplash%' AND s.image_url NOT ILIKE '%placeholder%' AND length(trim(s.image_url)) > 0) AS sample_real_image
FROM generated_articles g
LEFT JOIN news_events e ON g.event_id = e.id
LEFT JOIN news_signals s ON s.id = ANY(e.signal_ids)
WHERE g.hero_image_url ILIKE '%unsplash%' OR g.hero_image_url ILIKE '%placeholder%' OR g.hero_image_url ILIKE '%googleusercontent.com/j6_cofbogxh%'
GROUP BY g.id, g.headline, g.hero_image_url, g.event_id
ORDER BY real_signal_images DESC;
