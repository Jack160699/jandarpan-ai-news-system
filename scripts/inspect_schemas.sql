SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'news_articles' AND table_schema = 'public';

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'generated_articles' AND table_schema = 'public';

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'news_signals' AND table_schema = 'public';
