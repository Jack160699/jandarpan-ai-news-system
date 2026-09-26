SELECT
  count(*) AS total_signals,
  count(*) FILTER (WHERE image_url IS NOT NULL AND length(trim(image_url)) > 0) AS signals_with_image,
  count(*) FILTER (WHERE image_url IS NOT NULL AND image_url NOT ILIKE '%unsplash%' AND image_url NOT ILIKE '%placeholder%' AND length(trim(image_url)) > 0) AS signals_with_real_image
FROM news_signals
WHERE created_at >= now() - interval '7 days';
