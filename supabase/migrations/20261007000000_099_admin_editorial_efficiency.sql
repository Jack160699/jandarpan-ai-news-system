-- Migration 099: editorial efficiency numbers for the admin dashboard (read-only).
--
-- One SECURITY DEFINER function, executable by service_role only, computed from real tables in a single round trip:
--   ai_provider_usage_events  calls / success / latency / tokens per provider+model+operation
--   generated_articles        validation outcome (editorial_metadata.publish_decision), depth retries, repaired flag
-- Nothing is estimated: a ratio whose denominator is zero is returned as null, never as 0 or as a made-up value.
-- Additive and idempotent (create or replace). No table is created or altered.

create or replace function public.admin_editorial_efficiency(p_hours integer default 24)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with w as (
    select now() - make_interval(hours => greatest(1, least(coalesce(p_hours, 24), 24 * 31))) as since
  ),
  u as (
    select provider, model, operation, success,
           coalesce(latency_ms, 0) as latency_ms,
           coalesce(input_tokens, 0) + coalesce(output_tokens, 0) as tokens,
           event_id
      from public.ai_provider_usage_events, w
     where created_at >= w.since
       and operation in ('editorial_generate', 'editorial_repair')
  ),
  per_model as (
    select provider, model, operation,
           count(*) as calls,
           count(*) filter (where success) as ok,
           round(avg(latency_ms) filter (where success))::int as avg_latency_ms,
           sum(tokens)::bigint as tokens
      from u group by 1, 2, 3
  ),
  art as (
    select a.id, a.editorial_status, a.editorial_metadata
      from public.generated_articles a, w
     where a.created_at >= w.since
  ),
  tot as (
    select
      count(*) filter (where operation = 'editorial_generate') as gen_calls,
      count(*) filter (where operation = 'editorial_repair') as rep_calls,
      count(*) filter (where operation = 'editorial_generate' and success) as gen_ok,
      count(*) filter (where operation = 'editorial_repair' and success) as rep_ok,
      round(avg(latency_ms) filter (where operation = 'editorial_generate' and success))::int as gen_avg_ms,
      round(avg(latency_ms) filter (where operation = 'editorial_repair' and success))::int as rep_avg_ms,
      coalesce(sum(tokens), 0)::bigint as tokens,
      count(distinct event_id) filter (where event_id is not null) as events_with_calls
    from u
  ),
  art_tot as (
    select count(*) as generated,
           count(*) filter (where editorial_status = 'approved') as approved,
           count(*) filter (where coalesce(editorial_metadata ->> 'publish_decision', '') <> 'publish') as not_publish,
           count(*) filter (where editorial_metadata ->> 'repaired' = 'true') as repaired_flag,
           round(avg((editorial_metadata ->> 'depth_retries')::numeric), 2) as avg_depth_retries
      from art
  )
  select jsonb_build_object(
    'window_hours', greatest(1, least(coalesce(p_hours, 24), 24 * 31)),
    'generate', jsonb_build_object('calls', tot.gen_calls, 'ok', tot.gen_ok, 'avg_latency_ms', tot.gen_avg_ms),
    'repair', jsonb_build_object('calls', tot.rep_calls, 'ok', tot.rep_ok, 'avg_latency_ms', tot.rep_avg_ms),
    -- repair calls per generate call, as a percentage; null when nothing was generated
    'repair_pct', case when tot.gen_calls > 0 then round(100.0 * tot.rep_calls / tot.gen_calls, 1) end,
    'tokens', tot.tokens,
    'events_with_calls', tot.events_with_calls,
    'articles', jsonb_build_object(
      'generated', art_tot.generated,
      'approved', art_tot.approved,
      'not_publish', art_tot.not_publish,
      'rejection_pct', case when art_tot.generated > 0 then round(100.0 * art_tot.not_publish / art_tot.generated, 1) end,
      'repaired_flag', art_tot.repaired_flag,
      'avg_depth_retries', art_tot.avg_depth_retries
    ),
    'tokens_per_approved_article', case when art_tot.approved > 0 then round(tot.tokens::numeric / art_tot.approved) end,
    'per_model', coalesce((select jsonb_agg(to_jsonb(p) order by p.calls desc) from per_model p), '[]'::jsonb)
  )
  from tot, art_tot;
$$;

revoke all on function public.admin_editorial_efficiency(integer) from public, anon, authenticated;
grant execute on function public.admin_editorial_efficiency(integer) to service_role;

-- ---------------------------------------------------------------------------------------------------------------------
-- Feed integrity rows: the narrow projection the dashboard needs to apply the SAME canonical public gate and geography
-- policy that readers' feeds use (src/lib/feed/feed-selector.ts), so the dashboard can never disagree with the site.
-- No article body, no full translations: only has_en / has_hi booleans. Bounded to p_limit newest rows (max 500).
-- ---------------------------------------------------------------------------------------------------------------------
create or replace function public.admin_feed_integrity(p_limit integer default 400)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'generated_at', now(),
    'newest_signal_created_at', (select max(created_at) from public.news_signals),
    'newest_signal_published_at', (select max(published_at) from public.news_signals where published_at <= now() + interval '2 hours'),
    'rows', coalesce((
      select jsonb_agg(r) from (
        select a.id, a.event_id, a.slug, a.headline, a.language, a.published_at, a.created_at,
               a.editorial_status, a.workflow_status, a.geo_metadata,
               (a.translations ? 'en') as has_en, (a.translations ? 'hi') as has_hi
          from public.generated_articles a
         order by a.published_at desc nulls last, a.id desc
         limit greatest(1, least(coalesce(p_limit, 400), 500))
      ) r
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.admin_feed_integrity(integer) from public, anon, authenticated;
grant execute on function public.admin_feed_integrity(integer) to service_role;
