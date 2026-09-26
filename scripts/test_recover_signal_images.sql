SELECT 
  g.id as article_id,
  g.headline,
  g.published_at,
  g.hero_image_url as current_img,
  s.id as signal_id,
  s.source,
  s.image_url as signal_img
FROM generated_articles g
JOIN news_events e ON g.event_id = e.id
LEFT JOIN LATERAL (
  SELECT id, source, image_url
  FROM news_signals s
  WHERE s.id = ANY(e.signal_ids)
    AND s.image_url IS NOT NULL 
    AND s.image_url != ''
    AND s.image_url NOT LIKE '%unsplash%'
  LIMIT 1
) s ON true
WHERE g.published_at >= '2026-09-18' AND g.published_at <= '2026-09-23'
ORDER BY g.published_at DESC;
