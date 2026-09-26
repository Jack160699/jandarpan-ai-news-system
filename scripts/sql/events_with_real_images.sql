-- How many news_events have at least one signal with a real image?
SELECT
  count(DISTINCT e.id) AS total_events,
  count(DISTINCT e.id) FILTER (WHERE s.image_url IS NOT NULL AND s.image_url NOT ILIKE '%unsplash%' AND s.image_url NOT ILIKE '%placeholder%' AND length(trim(s.image_url)) > 0) AS events_with_real_signal_image,
  count(DISTINCT g.id) AS generated_articles_count
FROM news_events e
LEFT JOIN news_signals s ON s.id = ANY(e.signal_ids)
LEFT JOIN generated_articles g ON g.event_id = e.id
WHERE e.created_at >= now() - interval '7 days';
