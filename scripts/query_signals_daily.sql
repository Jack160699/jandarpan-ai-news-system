SELECT 
  date_trunc('day', created_at) as day,
  count(*) as signal_count,
  count(distinct provider) as providers
FROM news_signals
WHERE created_at >= NOW() - INTERVAL '35 days'
GROUP BY 1
ORDER BY 1 DESC;
