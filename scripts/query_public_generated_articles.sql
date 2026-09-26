SELECT id, headline, published_at, editorial_status, workflow_status, hero_image_url IS NOT NULL as has_image, tags
FROM generated_articles
WHERE published_at IS NOT NULL
  AND editorial_status IN ('approved', 'published', 'live')
ORDER BY published_at DESC;
