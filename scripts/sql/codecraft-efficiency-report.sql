-- CodeCraft Pro efficiency report (read-only). Run with the direct-SQL path, which works while REST is 402:
--   npx --no-install supabase db query --linked -f scripts/sql/codecraft-efficiency-report.sql -o table
-- Change the window in the `p` CTE. Compare a "before" run with an "after" run once the pipeline is running again.
-- Sources: ai_provider_usage_events (calls/latency/tokens/quota), generated_articles (+editorial_metadata, geo_metadata).
with p as (select interval '30 days' as w),
cc as (
  select * from ai_provider_usage_events, p
   where provider = 'codecraft' and operation in ('editorial_generate', 'editorial_repair') and created_at > now() - p.w
),
art as (
  select a.*, coalesce(a.published_at, a.created_at) as at from generated_articles a, p
   where coalesce(a.published_at, a.created_at) > now() - p.w
),
days as (select greatest(1, ceil(extract(epoch from p.w) / 86400))::numeric as n from p)
select * from (
  select 1 ord, 'window_days' metric, (select n::text from days) value
  union all select 2, 'codecraft_generate_calls', count(*)::text from cc where operation = 'editorial_generate'
  union all select 3, 'codecraft_generate_ok_pct', round(100.0 * count(*) filter (where success) / nullif(count(*), 0), 1)::text from cc where operation = 'editorial_generate'
  union all select 4, 'codecraft_generate_avg_latency_s', round(avg(latency_ms) filter (where success) / 1000.0, 1)::text from cc where operation = 'editorial_generate'
  union all select 5, 'codecraft_repair_calls', count(*)::text from cc where operation = 'editorial_repair'
  union all select 6, 'codecraft_repair_avg_latency_s', round(avg(latency_ms) filter (where success) / 1000.0, 1)::text from cc where operation = 'editorial_repair'
  union all select 7, 'repair_pass_pct (repair calls / generate calls)',
         round(100.0 * (select count(*) from cc where operation = 'editorial_repair') / nullif((select count(*) from cc where operation = 'editorial_generate'), 0), 1)::text
  union all select 8, 'codecraft_tokens_total', coalesce(sum(coalesce(input_tokens, 0) + coalesce(output_tokens, 0)), 0)::text from cc
  union all select 9, 'codecraft_tokens_per_published_article',
         round(coalesce((select sum(coalesce(input_tokens, 0) + coalesce(output_tokens, 0)) from cc), 0)::numeric
               / nullif((select count(*) from art where editorial_status = 'approved'), 0))::text
  union all select 10, 'codecraft_effective_throughput_articles_per_hour',
         round((select count(*) from art where editorial_status = 'approved')::numeric
               / nullif((select sum(latency_ms) from cc) / 3600000.0, 0), 1)::text
  union all select 11, 'codecraft_quota_remaining_last_event (provider-reported)',
         (select coalesce(quota_remaining::text, 'n/a') from ai_provider_usage_events where provider = 'codecraft' order by created_at desc limit 1)
  union all select 12, 'codecraft_last_call_at', (select max(created_at)::text from ai_provider_usage_events where provider = 'codecraft')
  union all select 20, 'articles_total', count(*)::text from art
  union all select 21, 'validation_rejection_pct (publish_decision <> publish)',
         round(100.0 * count(*) filter (where coalesce(editorial_metadata ->> 'publish_decision', '') <> 'publish') / nullif(count(*), 0), 1)::text from art
  union all select 22, 'articles_repaired_pct (editorial_metadata.repaired)',
         round(100.0 * count(*) filter (where editorial_metadata ->> 'repaired' = 'true') / nullif(count(*), 0), 1)::text from art
  union all select 23, 'avg_depth_retries_per_article', round(avg((editorial_metadata ->> 'depth_retries')::numeric), 2)::text from art
  union all select 30, 'published_per_day_total', round(count(*) filter (where editorial_status = 'approved')::numeric / (select n from days), 2)::text from art
  union all select 31, 'published_per_day_chhattisgarh (geo is_chhattisgarh)',
         round(count(*) filter (where editorial_status = 'approved' and geo_metadata ->> 'is_chhattisgarh' = 'true')::numeric / (select n from days), 2)::text from art
  union all select 32, 'published_per_day_district_specific',
         round(count(*) filter (where editorial_status = 'approved' and geo_metadata ->> 'scope' = 'DISTRICT_SPECIFIC')::numeric / (select n from days), 2)::text from art
  union all select 33, 'published_per_day_statewide_chhattisgarh',
         round(count(*) filter (where editorial_status = 'approved' and geo_metadata ->> 'scope' = 'STATEWIDE_CHHATTISGARH')::numeric / (select n from days), 2)::text from art
  union all select 34, 'published_per_day_india_relevant (INDIA_RELEVANT_TO_CHHATTISGARH + NATIONAL)',
         round(count(*) filter (where editorial_status = 'approved' and geo_metadata ->> 'scope' in ('INDIA_RELEVANT_TO_CHHATTISGARH', 'NATIONAL'))::numeric / (select n from days), 2)::text from art
  union all select 35, 'published_per_day_international',
         round(count(*) filter (where editorial_status = 'approved' and geo_metadata ->> 'scope' = 'INTERNATIONAL')::numeric / (select n from days), 2)::text from art
  union all select 36, 'approved_with_scope_UNKNOWN_or_missing (policy: must be 0 on district pages)',
         count(*) filter (where editorial_status = 'approved' and coalesce(geo_metadata ->> 'scope', 'UNKNOWN') = 'UNKNOWN')::text from art
  union all select 40, 'candidates_dead_lettered', count(*)::text from editorial_candidate_attempts where dead_lettered_at is not null
  union all select 41, 'candidate_failures_quality_checks_failed', count(*)::text from editorial_candidate_attempts where last_reason = 'quality_checks_failed'
  union all select 42, 'queue_pending', count(*)::text from news_ai_queue where status = 'pending'
) x order by ord;
