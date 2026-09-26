SELECT 
  g.id,
  g.headline,
  g.published_at,
  g.hero_image_url,
  e.id as event_id,
  e.title as event_title,
  e.event_data->>'image_url' as event_img,
  e.event_data->>'source_url' as event_source
FROM generated_articles g
LEFT JOIN news_events e ON g.event_id = e.id
WHERE g.published_at >= '2026-09-18' AND g.published_at <= '2026-09-23'
ORDER BY g.published_at DESC;
