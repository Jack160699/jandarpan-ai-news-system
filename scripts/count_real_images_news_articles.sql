SELECT 
  count(*) as total_articles,
  count(case when image_url is not null and image_url != '' then 1 end) as with_image,
  count(case when image_url like '%unsplash%' then 1 end) as unsplash_image,
  count(case when image_url not like '%unsplash%' and image_url is not null and image_url != '' then 1 end) as real_source_images
FROM news_articles
WHERE created_at >= NOW() - INTERVAL '30 days';
