SELECT
  count(*) AS total_events,
  count(*) FILTER (WHERE array_length(signal_ids, 1) > 0) AS events_with_signals,
  count(*) FILTER (WHERE is_live = true) AS live_events
FROM news_events
WHERE created_at >= now() - interval '7 days';
