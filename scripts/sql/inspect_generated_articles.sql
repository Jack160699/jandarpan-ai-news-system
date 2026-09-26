SELECT id, slug, headline, editorial_status, workflow_status, published_at, created_at, hero_image_url
FROM generated_articles
ORDER BY created_at DESC
LIMIT 30;
