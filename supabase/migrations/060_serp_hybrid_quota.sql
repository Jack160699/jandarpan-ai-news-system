-- Phase 11C — Hybrid SERP quota tracking (SerpAPI budget management)

create table if not exists public.serp_quota_usage (
  id uuid primary key default gen_random_uuid(),
  period_month text not null,
  searches_used integer not null default 0 check (searches_used >= 0),
  searches_skipped integer not null default 0 check (searches_skipped >= 0),
  daily_usage jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists serp_quota_usage_period_month_key
  on public.serp_quota_usage (period_month);

create table if not exists public.serp_quota_log (
  id uuid primary key default gen_random_uuid(),
  keyword text,
  keyword_id uuid references public.serp_keywords (id) on delete set null,
  action text not null
    check (action in ('search', 'skipped_quota', 'skipped_daily')),
  reason text,
  priority_score numeric,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists serp_quota_log_created_at_idx
  on public.serp_quota_log (created_at desc);

create index if not exists serp_quota_log_action_idx
  on public.serp_quota_log (action, created_at desc);
