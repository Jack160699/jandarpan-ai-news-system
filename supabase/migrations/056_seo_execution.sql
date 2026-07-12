-- Phase 12 — AI SEO Execution Engine (human-in-the-loop)

create table if not exists public.seo_execution_jobs (
  id uuid primary key default gen_random_uuid(),
  generated_article_id uuid not null,
  article_slug text not null,
  status text not null default 'pending'
    check (status in ('pending', 'running', 'completed', 'failed')),
  audit_scores jsonb not null default '{}'::jsonb,
  overall_score numeric,
  triggered_by text,
  started_at timestamptz,
  completed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists seo_execution_jobs_article_idx
  on public.seo_execution_jobs (generated_article_id, created_at desc);

create index if not exists seo_execution_jobs_status_idx
  on public.seo_execution_jobs (status, created_at desc);

create table if not exists public.seo_execution_suggestions (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.seo_execution_jobs (id) on delete cascade,
  generated_article_id uuid not null,
  suggestion_type text not null,
  field_key text not null,
  current_value text,
  suggested_value text not null,
  reason text not null,
  expected_impact text not null default '',
  confidence numeric not null default 0.5,
  priority text not null default 'medium'
    check (priority in ('high', 'medium', 'low')),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'applied')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists seo_execution_suggestions_job_idx
  on public.seo_execution_suggestions (job_id, status);

create index if not exists seo_execution_suggestions_article_idx
  on public.seo_execution_suggestions (generated_article_id, status, created_at desc);

create table if not exists public.seo_execution_history (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.seo_execution_jobs (id) on delete set null,
  generated_article_id uuid not null,
  article_slug text not null,
  snapshot jsonb not null default '{}'::jsonb,
  applied_fields jsonb not null default '{}'::jsonb,
  applied_by text not null,
  applied_by_email text,
  applied_at timestamptz not null default now(),
  rollback_available boolean not null default true,
  rolled_back_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists seo_execution_history_article_idx
  on public.seo_execution_history (generated_article_id, applied_at desc);

create table if not exists public.seo_execution_feedback (
  id uuid primary key default gen_random_uuid(),
  suggestion_id uuid references public.seo_execution_suggestions (id) on delete set null,
  job_id uuid references public.seo_execution_jobs (id) on delete set null,
  generated_article_id uuid,
  action text not null
    check (action in ('approve', 'reject', 'apply', 'rollback', 'audit')),
  user_id text,
  user_email text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists seo_execution_feedback_article_idx
  on public.seo_execution_feedback (generated_article_id, created_at desc);

alter table public.seo_execution_jobs enable row level security;
alter table public.seo_execution_suggestions enable row level security;
alter table public.seo_execution_history enable row level security;
alter table public.seo_execution_feedback enable row level security;

create policy "seo_execution_jobs_service_role"
  on public.seo_execution_jobs for all
  using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

create policy "seo_execution_suggestions_service_role"
  on public.seo_execution_suggestions for all
  using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

create policy "seo_execution_history_service_role"
  on public.seo_execution_history for all
  using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

create policy "seo_execution_feedback_service_role"
  on public.seo_execution_feedback for all
  using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

comment on table public.seo_execution_jobs is 'SEO execution audit jobs per article (Phase 12)';
comment on table public.seo_execution_suggestions is 'Human-reviewed SEO improvement suggestions';
comment on table public.seo_execution_history is 'Applied change snapshots for rollback';
comment on table public.seo_execution_feedback is 'Editor approve/reject/apply/rollback audit trail';
