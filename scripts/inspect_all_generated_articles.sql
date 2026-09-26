SELECT id, headline, published_at, workflow_status, editorial_status, tags 
FROM public.generated_articles 
ORDER BY published_at DESC NULLS LAST;
