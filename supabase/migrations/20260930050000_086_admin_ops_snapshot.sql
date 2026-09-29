-- Migration 086: admin operations snapshot + secure user listing + manual-run audit
--
-- One SECURITY DEFINER function (service_role only) computes every dashboard number from the
-- real tables in a single round trip — no client-side aggregation, no demo values.
-- "Today" is the IST calendar day (Asia/Kolkata). Definitions:
--   active user  = registered user with ANY of: sign-in, story consumed, view, like, comment
--   published    = generated_articles with published_at set and editorial_status in
--                  (approved, published, live)
--   article performance joins generated_articles by id ONLY, so ad objects ("ad-*") and the
--   hard-coded static-pool ids that also appear in story_engagement_counts are excluded.

-- ============================================================
-- Manual run audit + rate limit
-- ============================================================
create table if not exists public.admin_manual_runs (
  id           uuid primary key default gen_random_uuid(),
  action       text not null,
  requested_by text not null,
  requested_email text,
  role         text,
  status       text not null default 'started', -- started | ok | failed | rejected_rate_limit | rejected_overlap
  detail       jsonb,
  created_at   timestamptz not null default now(),
  finished_at  timestamptz
);
create index if not exists admin_manual_runs_action_idx on public.admin_manual_runs (action, created_at desc);
alter table public.admin_manual_runs enable row level security;

-- ============================================================
-- Secure user listing (auth.users never leaves the server)
-- ============================================================
create or replace function public.admin_list_users(
  p_search text default null,
  p_sort text default 'created_at',
  p_dir text default 'desc',
  p_limit integer default 25,
  p_offset integer default 0
) returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_limit integer := least(greatest(coalesce(p_limit, 25), 1), 100);
  v_offset integer := greatest(coalesce(p_offset, 0), 0);
  v_sort text := case when p_sort in ('email', 'created_at', 'last_sign_in_at') then p_sort else 'created_at' end;
  v_dir text := case when lower(p_dir) = 'asc' then 'asc' else 'desc' end;
  v_search text := nullif(trim(coalesce(p_search, '')), '');
  v_total bigint;
  v_rows jsonb;
begin
  select count(*) into v_total
    from auth.users u
   where v_search is null or u.email ilike '%' || v_search || '%';

  execute format($q$
    select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from (
      select u.id, u.email, u.created_at, u.last_sign_in_at,
             u.email_confirmed_at is not null as email_confirmed,
             case when u.banned_until is not null and u.banned_until > now() then 'banned'
                  when u.deleted_at is not null then 'deleted'
                  when u.email_confirmed_at is null then 'unconfirmed'
                  else 'active' end as status,
             (select string_agg(distinct i.provider, ',') from auth.identities i where i.user_id = u.id) as providers
        from auth.users u
       where $1 is null or u.email ilike '%%' || $1 || '%%'
       order by u.%I %s nulls last
       limit $2 offset $3
    ) t
  $q$, v_sort, v_dir)
  into v_rows
  using v_search, v_limit, v_offset;

  return jsonb_build_object('total', v_total, 'rows', v_rows, 'limit', v_limit, 'offset', v_offset);
end;
$$;

revoke all on function public.admin_list_users(text, text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.admin_list_users(text, text, text, integer, integer) to service_role;

-- ============================================================
-- Run-now helpers
-- ============================================================
create or replace function public.admin_retry_failed_queue()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_queue integer;
  v_jobs integer;
begin
  -- Only transient failures are retried; quality / geo / stale / duplicate rejections stay terminal.
  update public.news_ai_queue
     set status = 'pending', attempts = 0, next_attempt_at = null, lease_owner = null,
         lease_expires_at = null, processing_started_at = null, updated_at = now()
   where status in ('failed', 'dead')
     and coalesce(failure_class, 'unknown') in ('provider_quota', 'provider_timeout', 'database_error', 'unknown');
  get diagnostics v_queue = row_count;

  update public.worker_jobs
     set status = 'pending', attempts = 0, scheduled_at = now(), updated_at = now()
   where status = 'dead'
     and job_type <> 'editorial_generate'  -- editorial_generate is a direct lane now; those rows are orphans
     and created_at > now() - interval '48 hours';
  get diagnostics v_jobs = row_count;

  return jsonb_build_object('ai_queue_requeued', v_queue, 'worker_jobs_requeued', v_jobs);
end;
$$;

create or replace function public.admin_reprocess_stale_queue()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ai integer := 0;
  v_round integer;
  v_orphans integer;
begin
  loop
    select public.sweep_stale_ai_queue(48, 2000) into v_round;
    v_ai := v_ai + v_round;
    exit when v_round = 0 or v_ai >= 20000;
  end loop;

  -- Orphaned editorial_generate jobs: the lane generates directly from events and never claims these.
  update public.worker_jobs
     set status = 'dead', last_error = coalesce(last_error, 'orphaned: editorial_generate runs as a direct lane'),
         updated_at = now()
   where job_type = 'editorial_generate' and status = 'pending';
  get diagnostics v_orphans = row_count;

  return jsonb_build_object('ai_queue_rejected_stale', v_ai, 'orphan_editorial_jobs_closed', v_orphans);
end;
$$;

revoke all on function public.admin_retry_failed_queue() from public, anon, authenticated;
revoke all on function public.admin_reprocess_stale_queue() from public, anon, authenticated;
grant execute on function public.admin_retry_failed_queue() to service_role;
grant execute on function public.admin_reprocess_stale_queue() to service_role;

-- ============================================================
-- Snapshot
-- ============================================================
create or replace function public.admin_ops_snapshot(p_daily_target integer default 100)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_now       timestamptz := now();
  v_day       timestamptz := date_trunc('day', now() at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata';
  v_1h        timestamptz := now() - interval '1 hour';
  v_6h        timestamptz := now() - interval '6 hours';
  v_24h       timestamptz := now() - interval '24 hours';
  v_7d        timestamptz := now() - interval '7 days';
  v_30d       timestamptz := now() - interval '30 days';
  v_pub_status text[] := array['approved', 'published', 'live'];
  v_users     jsonb;
  v_pub       jsonb;
  v_signals   jsonb;
  v_queue     jsonb;
  v_funnel    jsonb;
  v_sources   jsonb;
  v_geo       jsonb;
  v_lang      jsonb;
  v_fail      jsonb;
  v_perf      jsonb;
  v_ai        jsonb;
  v_cron      jsonb;
  v_sched     jsonb := null;
begin
  -- ---------------- users ----------------
  with acts as (
    select u.id::text as uid, u.last_sign_in_at as ts from auth.users u where u.last_sign_in_at is not null
    union all select c.user_id, c.last_consumed_at from public.user_story_consumption c where c.last_consumed_at is not null
    union all select l.user_id, l.created_at from public.story_likes l
    union all select m.user_id, m.created_at from public.story_comments m
    union all select v.user_id, v.created_at from public.story_views_log v where v.user_id is not null
  ), reg as (
    select a.uid, a.ts from acts a join auth.users u on u.id::text = a.uid
  )
  select jsonb_build_object(
    'total', (select count(*) from auth.users),
    'new_today', (select count(*) from auth.users where created_at >= v_day),
    'new_7d', (select count(*) from auth.users where created_at >= v_7d),
    'new_30d', (select count(*) from auth.users where created_at >= v_30d),
    'active_today', (select count(distinct uid) from reg where ts >= v_day),
    'active_7d', (select count(distinct uid) from reg where ts >= v_7d),
    'active_30d', (select count(distinct uid) from reg where ts >= v_30d),
    'returning_30d', (select count(*) from (
        select uid from reg where ts >= v_30d
         group by uid having count(distinct (ts at time zone 'Asia/Kolkata')::date) >= 2) r)
  ) into v_users;

  -- ---------------- publishing ----------------
  select jsonb_build_object(
    'target', p_daily_target,
    'today', count(*) filter (where published_at >= v_day),
    'last_1h', count(*) filter (where published_at >= v_1h),
    'last_6h', count(*) filter (where published_at >= v_6h),
    'last_24h', count(*) filter (where published_at >= v_24h),
    'last_7d', count(*) filter (where published_at >= v_7d),
    'latest', (select jsonb_build_object('id', g.id, 'slug', g.slug, 'headline', g.headline,
                        'published_at', g.published_at, 'language', g.language)
                 from public.generated_articles g
                where g.published_at is not null and g.editorial_status = any (v_pub_status)
                order by g.published_at desc limit 1),
    'by_day', (select coalesce(jsonb_agg(jsonb_build_object('day', d, 'n', n) order by d), '[]'::jsonb) from (
                 select (published_at at time zone 'Asia/Kolkata')::date d, count(*) n
                   from public.generated_articles
                  where published_at >= v_7d and editorial_status = any (v_pub_status)
                  group by 1) x),
    'by_hour_today', (select coalesce(jsonb_agg(jsonb_build_object('hour', h, 'n', n) order by h), '[]'::jsonb) from (
                 select extract(hour from published_at at time zone 'Asia/Kolkata')::int h, count(*) n
                   from public.generated_articles
                  where published_at >= v_day and editorial_status = any (v_pub_status)
                  group by 1) x),
    'pending_review', (select count(*) from public.generated_articles where editorial_status = 'pending'),
    'today_without_image', count(*) filter (where published_at >= v_day and coalesce(hero_image_url, '') = ''),
    'today_with_image', count(*) filter (where published_at >= v_day and coalesce(hero_image_url, '') <> ''),
    'ist_hour_now', extract(hour from v_now at time zone 'Asia/Kolkata')::int,
    'ist_minute_now', extract(minute from v_now at time zone 'Asia/Kolkata')::int
  ) into v_pub
  from public.generated_articles
  where published_at is not null and editorial_status = any (v_pub_status);

  -- ---------------- signals ----------------
  select jsonb_build_object(
    'today', count(*) filter (where created_at >= v_day),
    'last_1h', count(*) filter (where created_at >= v_1h),
    'last_24h', count(*),
    'by_provider_today', (select coalesce(jsonb_object_agg(provider, n), '{}'::jsonb) from (
        select coalesce(provider, 'unknown') provider, count(*) n from public.news_signals
         where created_at >= v_day group by 1) p),
    'stale_at_ingest_24h', count(*) filter (where published_at < created_at - interval '36 hours')
  ) into v_signals
  from public.news_signals where created_at >= v_24h;

  -- ---------------- queue ----------------
  select jsonb_build_object(
    'ai_queue', (select coalesce(jsonb_object_agg(status, n), '{}'::jsonb) from (
        select status, count(*) n from public.news_ai_queue group by status) s),
    'ai_queue_oldest_pending', (select min(created_at) from public.news_ai_queue where status = 'pending'),
    'worker_jobs', (select coalesce(jsonb_agg(jsonb_build_object('job_type', job_type, 'status', status, 'n', n)), '[]'::jsonb) from (
        select job_type, status, count(*) n from public.worker_jobs
         where status in ('pending', 'claimed', 'dead', 'failed') group by 1, 2) w),
    'events_awaiting_article', (select count(*) from public.news_events e
        where e.created_at > v_now - interval '36 hours'
          and not exists (select 1 from public.generated_articles g where g.event_id = e.id)),
    'events_36h', (select count(*) from public.news_events where created_at > v_now - interval '36 hours')
  ) into v_queue;

  -- ---------------- funnel (1h / today / 24h) ----------------
  select jsonb_build_object(
    'last_1h', public._ops_funnel(v_1h, v_pub_status),
    'today', public._ops_funnel(v_day, v_pub_status),
    'last_24h', public._ops_funnel(v_24h, v_pub_status)
  ) into v_funnel;

  -- ---------------- sources ----------------
  select jsonb_build_object(
    'state', (select coalesce(jsonb_agg(to_jsonb(s)), '[]'::jsonb) from public.ingestion_source_state s),
    'today', (select coalesce(jsonb_agg(row_to_json(x)), '[]'::jsonb) from (
        select s->>'source' as source,
               sum(coalesce((s->>'fetched')::int, 0)) as fetched,
               sum(coalesce((s->>'valid')::int, 0)) as new_items,
               sum(coalesce((s->>'duplicates')::int, 0)) as duplicates,
               sum(coalesce((s->>'rejected')::int, 0)) as rejected,
               count(*) filter (where s->>'error' is not null) as failures
          from public.ingestion_logs l, jsonb_array_elements(coalesce(l.metadata->'rss_source_analytics', '[]'::jsonb)) s
         where l.created_at >= v_day group by 1) x),
    'ingest_runs_24h', (select coalesce(jsonb_agg(row_to_json(r)), '[]'::jsonb) from (
        select status, count(*) n, round(avg(duration_ms)) avg_ms, sum(inserted) inserted, sum(skipped_duplicates) duplicates
          from public.ingestion_logs where created_at >= v_24h group by status) r),
    'provider_errors_24h', (select coalesce(jsonb_agg(row_to_json(e)), '[]'::jsonb) from (
        select left(err, 90) as error, count(*) n
          from public.ingestion_logs l, jsonb_array_elements_text(coalesce(l.provider_errors, '[]'::jsonb)) err
         where l.created_at >= v_24h group by 1 order by 2 desc limit 12) e)
  ) into v_sources;

  -- ---------------- geo coverage ----------------
  select jsonb_build_object(
    'scope_today', (select coalesce(jsonb_object_agg(scope, n), '{}'::jsonb) from (
        select public._ops_geo_scope(geo_metadata) scope, count(*) n from public.generated_articles
         where published_at >= v_day and editorial_status = any (v_pub_status) group by 1) s),
    'scope_24h', (select coalesce(jsonb_object_agg(scope, n), '{}'::jsonb) from (
        select public._ops_geo_scope(geo_metadata) scope, count(*) n from public.generated_articles
         where published_at >= v_24h and editorial_status = any (v_pub_status) group by 1) s),
    'districts', (select coalesce(jsonb_agg(row_to_json(d)), '[]'::jsonb) from (
        select geo_metadata->>'primary_district' as district,
               count(*) filter (where published_at >= v_day) as today,
               count(*) filter (where published_at >= v_7d) as last_7d,
               max(published_at) as latest_at
          from public.generated_articles
         where editorial_status = any (v_pub_status) and published_at >= v_30d
           and geo_metadata->>'scope' = 'DISTRICT_SPECIFIC'
           and geo_metadata->>'primary_district' is not null
         group by 1) d),
    'legacy_unverified_district_rows', (select count(*) from public.generated_articles
        where editorial_status = any (v_pub_status) and published_at >= v_30d
          and geo_metadata->>'scope' is null and geo_metadata->>'primary_district' is not null),
    'signals_scope_24h', (select coalesce(jsonb_object_agg(k, n), '{}'::jsonb) from (
        select coalesce(geo_metadata->>'classification_kind', 'none') k, count(*) n
          from public.news_signals where created_at >= v_24h group by 1) s)
  ) into v_geo;

  -- ---------------- language ----------------
  select jsonb_build_object(
    'today', (select coalesce(jsonb_object_agg(language, n), '{}'::jsonb) from (
        select coalesce(language, 'unknown') language, count(*) n from public.generated_articles
         where published_at >= v_day and editorial_status = any (v_pub_status) group by 1) s),
    'script_mismatch_published', (select count(*) from public.generated_articles
        where published_at >= v_30d and editorial_status = any (v_pub_status)
          and ((language = 'en' and headline ~ '[ऀ-ॿ]')
            or (language = 'hi' and headline !~ '[ऀ-ॿ]'))),
    'gate_failures_24h', (select count(*) from public.generated_articles
        where created_at >= v_24h and editorial_metadata->'publication_gates'->>'passed' = 'false'),
    'gate_failure_codes_24h', (select coalesce(jsonb_object_agg(code, n), '{}'::jsonb) from (
        select f->>'code' code, count(*) n from public.generated_articles g,
               jsonb_array_elements(coalesce(g.editorial_metadata->'publication_gates'->'failures', '[]'::jsonb)) f
         where g.created_at >= v_24h group by 1) c),
    'untranslated_today', (select count(*) from public.generated_articles
        where published_at >= v_day and editorial_status = any (v_pub_status)
          and (translations is null or translations = '{}'::jsonb)
          and (editorial_metadata->'translations' is null or editorial_metadata->'translations' = '{}'::jsonb)),
    'cross_language_duplicates', null
  ) into v_lang;

  -- ---------------- failure center ----------------
  select jsonb_build_object(
    'editorial_skip_reasons_24h', (select coalesce(jsonb_agg(row_to_json(x) order by x.n desc), '[]'::jsonb) from (
        select e.key as reason, sum((e.value)::int) as n
          from public.ops_cron_runs r, jsonb_each_text(coalesce(r.metadata->'skipReasonCounts', '{}'::jsonb)) e
         where r.job = 'editorial-generate' and r.created_at >= v_24h group by 1) x),
    'ai_queue_reasons', (select coalesce(jsonb_agg(row_to_json(x) order by x.n desc), '[]'::jsonb) from (
        select status, coalesce(failure_class, reject_reason, 'unspecified') reason, count(*) n
          from public.news_ai_queue where status not in ('pending', 'processing', 'completed') group by 1, 2) x),
    'dead_jobs', (select coalesce(jsonb_agg(row_to_json(x) order by x.n desc), '[]'::jsonb) from (
        select job_type, left(coalesce(last_error, 'unknown'), 70) reason, count(*) n
          from public.worker_jobs where status in ('dead', 'failed') group by 1, 2 order by 3 desc limit 15) x),
    'cron_failures_24h', (select coalesce(jsonb_agg(row_to_json(x) order by x.n desc), '[]'::jsonb) from (
        select job, count(*) n, max(left(coalesce(error, ''), 100)) last_error
          from public.ops_cron_runs where ok = false and created_at >= v_24h group by 1) x),
    'ai_failures_24h', (select coalesce(jsonb_agg(row_to_json(x) order by x.n desc), '[]'::jsonb) from (
        select provider, model, coalesce(fallback_reason, 'unknown') reason, count(*) n
          from public.ai_provider_usage_events where success = false and created_at >= v_24h group by 1, 2, 3) x)
  ) into v_fail;

  -- ---------------- article performance (real articles only) ----------------
  with base as (
    select g.id, g.slug, g.headline, g.language, g.published_at,
           g.geo_metadata->>'primary_district' as district, g.geo_metadata->>'scope' as scope,
           coalesce(g.editorial_metadata->'source_attribution'->0->>'source', g.editorial_metadata->'source_attribution'->0->>'name') as source
      from public.generated_articles g
     where g.published_at is not null and g.editorial_status = any (v_pub_status)
  ), v24 as (
    select story_id, count(*) n from public.story_views_log where created_at >= v_24h group by 1
  ), v7 as (
    select story_id, count(*) n from public.story_views_log where created_at >= v_7d group by 1
  ), l24 as (
    select story_id, count(*) n from public.story_likes where created_at >= v_24h group by 1
  ), c24 as (
    select story_id, count(*) n from public.story_comments where created_at >= v_24h group by 1
  ), l7 as (
    select story_id, count(*) n from public.story_likes where created_at >= v_7d group by 1
  ), c7 as (
    select story_id, count(*) n from public.story_comments where created_at >= v_7d group by 1
  ), joined as (
    select b.*, coalesce(v24.n, 0) views_24h, coalesce(l24.n, 0) likes_24h, coalesce(c24.n, 0) comments_24h,
           coalesce(v7.n, 0) views_7d, coalesce(l7.n, 0) likes_7d, coalesce(c7.n, 0) comments_7d,
           coalesce(ec.views_count, 0) views_total, coalesce(ec.likes_count, 0) likes_total, coalesce(ec.comments_count, 0) comments_total
      from base b
      left join v24 on v24.story_id = b.id::text
      left join v7 on v7.story_id = b.id::text
      left join l24 on l24.story_id = b.id::text
      left join c24 on c24.story_id = b.id::text
      left join l7 on l7.story_id = b.id::text
      left join c7 on c7.story_id = b.id::text
      left join public.story_engagement_counts ec on ec.story_id = b.id::text
  )
  select jsonb_build_object(
    'top_views_24h', (select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) from (
        select * from joined where views_24h > 0 order by views_24h desc, published_at desc limit 8) x),
    'top_engagement_24h', (select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) from (
        select *, (likes_24h + comments_24h) as engagement_24h,
               round(((likes_24h + comments_24h)::numeric / nullif(views_24h, 0)) * 100, 1) as engagement_rate_24h
          from joined where (likes_24h + comments_24h) > 0 order by (likes_24h + comments_24h) desc, views_24h desc limit 8) x),
    'top_views_7d', (select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) from (
        select * from joined where views_7d > 0 order by views_7d desc, published_at desc limit 8) x),
    'top_total', (select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) from (
        select * from joined where views_total > 0 order by views_total desc limit 8) x),
    'excluded_non_article_ids', (select count(*) from public.story_engagement_counts ec
        where not exists (select 1 from public.generated_articles g where g.id::text = ec.story_id))
  ) into v_perf;

  -- ---------------- AI providers ----------------
  select jsonb_build_object(
    'circuit', (select coalesce(jsonb_agg(to_jsonb(c) order by c.updated_at desc), '[]'::jsonb) from public.ai_provider_circuit c),
    'usage_24h', (select coalesce(jsonb_agg(row_to_json(x) order by x.calls desc), '[]'::jsonb) from (
        select provider, model, operation, count(*) calls,
               count(*) filter (where success) ok, count(*) filter (where not success) failed,
               round(avg(latency_ms) filter (where success)) avg_latency_ms,
               max(created_at) filter (where success) last_success_at,
               max(created_at) filter (where not success) last_failure_at,
               (array_agg(fallback_reason order by created_at desc) filter (where not success))[1] last_error
          from public.ai_provider_usage_events
         where created_at >= v_24h and operation in ('editorial_generate', 'editorial_repair', 'editorial_review', 'translation')
         group by 1, 2, 3) x)
  ) into v_ai;

  -- ---------------- cron ----------------
  select jsonb_build_object(
    'jobs', (select coalesce(jsonb_agg(row_to_json(x)), '[]'::jsonb) from (
        select job,
               max(created_at) as last_run_at,
               (array_agg(ok order by created_at desc))[1] as last_ok,
               (array_agg(duration_ms order by created_at desc))[1] as last_duration_ms,
               max(created_at) filter (where ok) as last_success_at,
               max(created_at) filter (where not ok) as last_failure_at,
               (array_agg(left(error, 120) order by created_at desc) filter (where not ok))[1] as last_error,
               count(*) as runs_24h,
               count(*) filter (where not ok) as failures_24h,
               count(*) filter (where degraded) as degraded_24h
          from public.ops_cron_runs where created_at >= v_24h group by job) x)
  ) into v_cron;

  if to_regclass('public.scheduler_dispatch_log') is not null then
    begin
      execute 'select coalesce(jsonb_agg(row_to_json(s)), ''[]''::jsonb) from public.scheduler_dispatch_summary(24) s' into v_sched;
    exception when others then
      v_sched := null;
    end;
  end if;

  return jsonb_build_object(
    'generated_at', v_now,
    'day_start', v_day,
    'users', v_users,
    'publishing', v_pub,
    'signals', v_signals,
    'queue', v_queue,
    'funnel', v_funnel,
    'sources', v_sources,
    'geo', v_geo,
    'language', v_lang,
    'failures', v_fail,
    'performance', v_perf,
    'ai', v_ai,
    'cron', v_cron,
    'scheduler', v_sched,
    'pg_cron_installed', (select exists (select 1 from pg_extension where extname = 'pg_cron'))
  );
end;
$$;

-- helpers ---------------------------------------------------------------
create or replace function public._ops_geo_scope(m jsonb)
returns text
language sql
immutable
as $$
  select coalesce(
    nullif(m->>'scope', ''),
    case m->>'classification_kind'
      when 'district' then 'LEGACY_DISTRICT'
      when 'multi_district' then 'LEGACY_DISTRICT'
      when 'statewide' then 'LEGACY_STATEWIDE'
      when 'non_cg' then 'LEGACY_NON_CG'
      when 'unknown' then 'LEGACY_UNKNOWN'
      else 'UNCLASSIFIED'
    end
  )
$$;

create or replace function public._ops_funnel(p_since timestamptz, p_pub_status text[])
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'fetched', (select coalesce(sum(total_fetched), 0) from public.ingestion_logs where created_at >= p_since),
    'normalized', (select coalesce(sum(total_valid), 0) from public.ingestion_logs where created_at >= p_since),
    'duplicates_removed', (select coalesce(sum(skipped_duplicates), 0) from public.ingestion_logs where created_at >= p_since),
    'signals_inserted', (select count(*) from public.news_signals where created_at >= p_since),
    'geo_classified', (select count(*) from public.news_signals where created_at >= p_since
                        and (geo_metadata is not null or ingestion_metadata ? 'geo')),
    'clustered_events', (select count(*) from public.news_events where created_at >= p_since),
    'editorial_candidates', (select count(*) from public.news_events e where e.created_at >= p_since
                              and exists (select 1 from public.news_signals s where s.id = any (e.signal_ids)
                                           and s.published_at > e.created_at - interval '36 hours')),
    'ai_generated', (select count(*) from public.generated_articles where created_at >= p_since),
    'qa_passed', (select count(*) from public.generated_articles where created_at >= p_since
                   and editorial_status = any (p_pub_status)),
    'published', (select count(*) from public.generated_articles where published_at >= p_since
                   and editorial_status = any (p_pub_status))
  )
$$;

revoke all on function public.admin_ops_snapshot(integer) from public, anon, authenticated;
revoke all on function public._ops_funnel(timestamptz, text[]) from public, anon, authenticated;
grant execute on function public.admin_ops_snapshot(integer) to service_role;
grant execute on function public._ops_funnel(timestamptz, text[]) to service_role;
grant execute on function public._ops_geo_scope(jsonb) to service_role;
