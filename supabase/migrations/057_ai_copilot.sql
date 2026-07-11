-- Phase 13 — AI Editorial Copilot & Unified Intelligence Center

create table if not exists public.ai_recommendations (
  id uuid primary key default gen_random_uuid(),
  external_key text not null,
  source text not null
    check (source in (
      'seo_intelligence',
      'serp_tracker',
      'search_console',
      'execution_engine',
      'competitor_intelligence',
      'copilot'
    )),
  priority text not null default 'medium'
    check (priority in ('high', 'medium', 'low')),
  confidence numeric not null default 0.5,
  article_id uuid,
  article_slug text,
  district text,
  category text,
  title text not null,
  reason text not null,
  recommended_action text not null,
  status text not null default 'open'
    check (status in ('open', 'viewed', 'approved', 'applied', 'rejected', 'dismissed')),
  priority_score numeric not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists ai_recommendations_external_key
  on public.ai_recommendations (external_key);

create index if not exists ai_recommendations_priority_idx
  on public.ai_recommendations (status, priority_score desc, created_at desc);

create index if not exists ai_recommendations_district_idx
  on public.ai_recommendations (district, priority_score desc);

create table if not exists public.ai_actions (
  id uuid primary key default gen_random_uuid(),
  recommendation_id uuid references public.ai_recommendations (id) on delete set null,
  article_id uuid,
  action_type text not null
    check (action_type in (
      'generated',
      'viewed',
      'approved',
      'applied',
      'rejected',
      'rollback',
      'chat_query'
    )),
  user_id text,
  user_email text,
  outcome text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists ai_actions_recommendation_idx
  on public.ai_actions (recommendation_id, created_at desc);

create index if not exists ai_actions_article_idx
  on public.ai_actions (article_id, created_at desc);

create table if not exists public.ai_reports (
  id uuid primary key default gen_random_uuid(),
  report_type text not null
    check (report_type in (
      'daily_briefing',
      'weekly_seo',
      'monthly_executive',
      'growth_report',
      'opportunities',
      'risks'
    )),
  title text not null,
  summary text not null,
  content jsonb not null default '{}'::jsonb,
  generated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists ai_reports_type_generated_idx
  on public.ai_reports (report_type, generated_at desc);

create table if not exists public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id text,
  user_email text,
  role text not null check (role in ('user', 'assistant')),
  message text not null,
  intent text,
  response_payload jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists ai_conversations_user_idx
  on public.ai_conversations (user_id, created_at desc);

alter table public.ai_recommendations enable row level security;
alter table public.ai_actions enable row level security;
alter table public.ai_reports enable row level security;
alter table public.ai_conversations enable row level security;

create policy "ai_recommendations_service_role"
  on public.ai_recommendations for all
  using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

create policy "ai_actions_service_role"
  on public.ai_actions for all
  using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

create policy "ai_reports_service_role"
  on public.ai_reports for all
  using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

create policy "ai_conversations_service_role"
  on public.ai_conversations for all
  using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

comment on table public.ai_recommendations is 'Unified normalized recommendations from all intelligence modules (Phase 13)';
comment on table public.ai_actions is 'Editor action audit trail for copilot recommendations';
comment on table public.ai_reports is 'Generated executive briefings and reports';
comment on table public.ai_conversations is 'AI copilot chat history';
