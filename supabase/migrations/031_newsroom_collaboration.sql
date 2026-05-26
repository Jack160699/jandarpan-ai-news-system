-- Realtime newsroom collaboration

create table if not exists public.newsroom_editor_locks (
  article_id uuid primary key references public.generated_articles(id) on delete cascade,
  tenant_id uuid not null references public.newsroom_tenants(id) on delete cascade,
  locked_by uuid not null references auth.users(id) on delete cascade,
  locked_by_email text not null,
  acquired_at timestamptz not null default now(),
  expires_at timestamptz not null,
  heartbeat_at timestamptz not null default now()
);

create index if not exists idx_editor_locks_tenant
  on public.newsroom_editor_locks (tenant_id);

create table if not exists public.newsroom_inline_comments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.newsroom_tenants(id) on delete cascade,
  article_id uuid not null references public.generated_articles(id) on delete cascade,
  anchor_id text not null default 'general',
  selection jsonb not null default '{}'::jsonb,
  body text not null,
  author_user_id uuid references auth.users(id) on delete set null,
  author_email text not null,
  mentions uuid[] not null default '{}',
  resolved boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_inline_comments_article
  on public.newsroom_inline_comments (article_id, created_at desc);

create table if not exists public.newsroom_chat_messages (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.newsroom_tenants(id) on delete cascade,
  channel text not null default 'general',
  body text not null,
  author_user_id uuid references auth.users(id) on delete set null,
  author_email text not null,
  mentions uuid[] not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists idx_chat_messages_tenant
  on public.newsroom_chat_messages (tenant_id, created_at desc);

create table if not exists public.newsroom_notifications (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.newsroom_tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  read_at timestamptz,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_user
  on public.newsroom_notifications (user_id, read_at nulls first, created_at desc);

create table if not exists public.newsroom_activity_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.newsroom_tenants(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_email text not null,
  event_type text not null,
  summary text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_activity_tenant_time
  on public.newsroom_activity_events (tenant_id, created_at desc);

create table if not exists public.newsroom_approval_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.newsroom_tenants(id) on delete cascade,
  article_id uuid not null references public.generated_articles(id) on delete cascade,
  requested_by uuid not null references auth.users(id) on delete cascade,
  requested_by_email text not null,
  approver_user_id uuid references auth.users(id) on delete set null,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  message text,
  response_note text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists idx_approval_article
  on public.newsroom_approval_requests (article_id, status);

-- OT-lite: append-only document operations per article
create table if not exists public.newsroom_doc_operations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.newsroom_tenants(id) on delete cascade,
  article_id uuid not null references public.generated_articles(id) on delete cascade,
  version bigint not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  user_email text not null,
  op_type text not null check (op_type in ('snapshot', 'patch')),
  content_hash text,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  unique (article_id, version)
);

create index if not exists idx_doc_ops_article_version
  on public.newsroom_doc_operations (article_id, version desc);

create table if not exists public.newsroom_doc_heads (
  article_id uuid primary key references public.generated_articles(id) on delete cascade,
  tenant_id uuid not null references public.newsroom_tenants(id) on delete cascade,
  version bigint not null default 0,
  content_hash text,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.newsroom_editor_locks enable row level security;
alter table public.newsroom_inline_comments enable row level security;
alter table public.newsroom_chat_messages enable row level security;
alter table public.newsroom_notifications enable row level security;
alter table public.newsroom_activity_events enable row level security;
alter table public.newsroom_approval_requests enable row level security;
alter table public.newsroom_doc_operations enable row level security;
alter table public.newsroom_doc_heads enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array[
    'newsroom_editor_locks',
    'newsroom_inline_comments',
    'newsroom_chat_messages',
    'newsroom_notifications',
    'newsroom_activity_events',
    'newsroom_approval_requests',
    'newsroom_doc_operations',
    'newsroom_doc_heads'
  ]
  loop
    execute format('drop policy if exists "Service role %s" on public.%I', t, t);
    execute format(
      'create policy "Service role %s" on public.%I for all to service_role using (true) with check (true)',
      t, t
    );
  end loop;
end $$;

comment on table public.newsroom_doc_operations is
  'OT-lite append log — version monotonic per article';
