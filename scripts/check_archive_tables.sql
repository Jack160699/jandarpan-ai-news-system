SELECT 'platform_articles' as tbl, count(*) as count, min(created_at)::text as min_date, max(created_at)::text as max_date FROM platform_articles
UNION ALL
SELECT 'news_articles' as tbl, count(*) as count, min(created_at)::text as min_date, max(created_at)::text as max_date FROM news_articles
UNION ALL
SELECT 'news_signals' as tbl, count(*) as count, min(created_at)::text as min_date, max(created_at)::text as max_date FROM news_signals
UNION ALL
SELECT 'news_events' as tbl, count(*) as count, min(created_at)::text as min_date, max(created_at)::text as max_date FROM news_events
UNION ALL
SELECT 'queue_cleanup_archive' as tbl, count(*) as count, min(archived_at)::text as min_date, max(archived_at)::text as max_date FROM queue_cleanup_archive
UNION ALL
SELECT 'generated_articles' as tbl, count(*) as count, min(published_at)::text as min_date, max(published_at)::text as max_date FROM generated_articles
UNION ALL
SELECT 'editorial_candidates' as tbl, count(*) as count, min(created_at)::text as min_date, max(created_at)::text as max_date FROM editorial_candidates;
