-- Editorial workflow pipeline: Draft → Review → Fact Check → Legal → Scheduled → Published → Archived

alter table public.generated_articles
  add column if not exists workflow_status text not null default 'draft'
    check (
      workflow_status in (
        'draft',
        'review',
        'fact_check',
        'legal_review',
        'scheduled',
        'published',
        'archived'
      )
    );

alter table public.generated_articles
  add column if not exists workflow_deadline_at timestamptz;

alter table public.generated_articles
  add column if not exists workflow_assigned_to uuid;

alter table public.generated_articles
  add column if not exists workflow_rejection_reason text;

create index if not exists idx_generated_articles_workflow_status
  on public.generated_articles (workflow_status, workflow_deadline_at);

create index if not exists idx_generated_articles_workflow_assignee
  on public.generated_articles (workflow_assigned_to)
  where workflow_assigned_to is not null;

-- Backfill from legacy editorial_status
update public.generated_articles
set workflow_status = case
  when editorial_status = 'approved' and published_at is not null then 'published'
  when editorial_status = 'approved' and published_at is null then 'scheduled'
  when editorial_status = 'rejected' then 'draft'
  when editorial_status = 'pending' then 'review'
  else 'draft'
end
;

comment on column public.generated_articles.workflow_status is
  'Pipeline: draft, review, fact_check, legal_review, scheduled, published, archived';

-- Workflow event log (history + notifications source)
create table if not exists public.editorial_workflow_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.newsroom_tenants(id) on delete cascade,
  article_id uuid not null references public.generated_articles(id) on delete cascade,
  actor_user_id uuid,
  actor_email text,
  event_type text not null,
  from_status text,
  to_status text,
  comment text,
  rejection_reason text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_workflow_events_article
  on public.editorial_workflow_events (article_id, created_at desc);

create index if not exists idx_workflow_events_tenant
  on public.editorial_workflow_events (tenant_id, created_at desc);

-- Threaded editor comments
create table if not exists public.editorial_workflow_comments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.newsroom_tenants(id) on delete cascade,
  article_id uuid not null references public.generated_articles(id) on delete cascade,
  author_user_id uuid,
  author_email text not null,
  body text not null,
  workflow_status text,
  created_at timestamptz not null default now()
);

create index if not exists idx_workflow_comments_article
  on public.editorial_workflow_comments (article_id, created_at desc);

alter table public.editorial_workflow_events enable row level security;
alter table public.editorial_workflow_comments enable row level security;

drop policy if exists "Service role workflow events" on public.editorial_workflow_events;
create policy "Service role workflow events"
  on public.editorial_workflow_events for all to service_role using (true) with check (true);

drop policy if exists "Service role workflow comments" on public.editorial_workflow_comments;
create policy "Service role workflow comments"
  on public.editorial_workflow_comments for all to service_role using (true) with check (true);
