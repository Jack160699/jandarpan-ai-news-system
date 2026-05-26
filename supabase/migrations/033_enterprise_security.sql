-- 033: Enterprise security — RLS hardening, security audit tables, RBAC helpers

-- ─── Security schema helpers (avoid recursive RLS on tenant_memberships) ───

create or replace function public.security_user_tenant_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select tenant_id
  from public.tenant_memberships
  where user_id = auth.uid()
    and status = 'active';
$$;

revoke all on function public.security_user_tenant_ids() from public;
grant execute on function public.security_user_tenant_ids() to authenticated, service_role;

create or replace function public.security_is_super_admin(p_tenant_id uuid default null)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.tenant_memberships m
    where m.user_id = auth.uid()
      and m.status = 'active'
      and m.role = 'super_admin'
      and (p_tenant_id is null or m.tenant_id = p_tenant_id)
  );
$$;

revoke all on function public.security_is_super_admin(uuid) from public;
grant execute on function public.security_is_super_admin(uuid) to authenticated, service_role;

create or replace function public.security_user_has_tenant(p_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.tenant_memberships m
    where m.user_id = auth.uid()
      and m.status = 'active'
      and m.tenant_id = p_tenant_id
  );
$$;

revoke all on function public.security_user_has_tenant(uuid) from public;
grant execute on function public.security_user_has_tenant(uuid) to authenticated, service_role;

-- ─── Security audit & session tables ───

create table if not exists public.security_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  tenant_id uuid references public.newsroom_tenants (id) on delete set null,
  session_token_hash text not null,
  device_fingerprint text,
  user_agent text,
  ip_address inet,
  country_code text,
  last_seen_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  revoke_reason text,
  created_at timestamptz not null default now()
);

create index if not exists idx_security_sessions_user
  on public.security_sessions (user_id, revoked_at nulls first);

create index if not exists idx_security_sessions_token
  on public.security_sessions (session_token_hash)
  where revoked_at is null;

create table if not exists public.security_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  device_fingerprint text not null,
  label text,
  user_agent text,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  trusted boolean not null default false,
  unique (user_id, device_fingerprint)
);

create table if not exists public.security_login_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  email text,
  tenant_id uuid references public.newsroom_tenants (id) on delete set null,
  event_type text not null check (
    event_type in (
      'login_success',
      'login_failure',
      'logout',
      'session_revoked',
      'password_reset',
      '2fa_enabled',
      '2fa_disabled',
      '2fa_challenge_success',
      '2fa_challenge_failure',
      'suspicious_login',
      'account_locked'
    )
  ),
  ip_address inet,
  user_agent text,
  device_fingerprint text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_security_login_events_user
  on public.security_login_events (user_id, created_at desc);

create index if not exists idx_security_login_events_email
  on public.security_login_events (lower(email), created_at desc);

create table if not exists public.security_audit_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.newsroom_tenants (id) on delete set null,
  actor_user_id uuid references auth.users (id) on delete set null,
  actor_email text,
  action text not null,
  resource_type text,
  resource_id text,
  ip_address inet,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_security_audit_tenant
  on public.security_audit_events (tenant_id, created_at desc);

create table if not exists public.security_permission_changes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.newsroom_tenants (id) on delete cascade,
  target_user_id uuid references auth.users (id) on delete set null,
  target_email text,
  changed_by_user_id uuid references auth.users (id) on delete set null,
  changed_by_email text,
  previous_role text,
  new_role text,
  previous_status text,
  new_status text,
  ip_address inet,
  created_at timestamptz not null default now()
);

create index if not exists idx_security_permission_changes_tenant
  on public.security_permission_changes (tenant_id, created_at desc);

create table if not exists public.user_two_factor (
  user_id uuid primary key references auth.users (id) on delete cascade,
  totp_secret_encrypted text not null,
  enabled_at timestamptz,
  backup_codes_hash text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.security_sessions is 'Active dashboard sessions — revocation and device tracking';
comment on table public.security_audit_events is 'Enterprise security audit trail (login, RBAC, admin actions)';

-- RLS: service role only (app layer enforces access)
alter table public.security_sessions enable row level security;
alter table public.security_devices enable row level security;
alter table public.security_login_events enable row level security;
alter table public.security_audit_events enable row level security;
alter table public.security_permission_changes enable row level security;
alter table public.user_two_factor enable row level security;

drop policy if exists "Service role security_sessions" on public.security_sessions;
create policy "Service role security_sessions"
  on public.security_sessions for all to service_role
  using (true) with check (true);

drop policy if exists "Service role security_devices" on public.security_devices;
create policy "Service role security_devices"
  on public.security_devices for all to service_role
  using (true) with check (true);

drop policy if exists "Service role security_login_events" on public.security_login_events;
create policy "Service role security_login_events"
  on public.security_login_events for all to service_role
  using (true) with check (true);

drop policy if exists "Service role security_audit_events" on public.security_audit_events;
create policy "Service role security_audit_events"
  on public.security_audit_events for all to service_role
  using (true) with check (true);

drop policy if exists "Service role security_permission_changes" on public.security_permission_changes;
create policy "Service role security_permission_changes"
  on public.security_permission_changes for all to service_role
  using (true) with check (true);

drop policy if exists "Service role user_two_factor" on public.user_two_factor;
create policy "Service role user_two_factor"
  on public.user_two_factor for all to service_role
  using (true) with check (true);

-- Authenticated users may read own 2FA status (not secret)
drop policy if exists "Users read own 2fa status" on public.user_two_factor;
create policy "Users read own 2fa status"
  on public.user_two_factor for select to authenticated
  using (user_id = auth.uid());

-- ─── Harden tenant_memberships RLS (use security definer helpers) ───

drop policy if exists "Users read own membership" on public.tenant_memberships;
create policy "Users read own membership"
  on public.tenant_memberships for select to authenticated
  using (user_id = auth.uid() and status = 'active');

drop policy if exists "Super admin read tenant memberships" on public.tenant_memberships;
create policy "Super admin read tenant memberships"
  on public.tenant_memberships for select to authenticated
  using (
    tenant_id in (select public.security_user_tenant_ids())
    and public.security_is_super_admin(tenant_id)
  );

drop policy if exists "Super admin update tenant memberships" on public.tenant_memberships;
create policy "Super admin update tenant memberships"
  on public.tenant_memberships for update to authenticated
  using (
    public.security_is_super_admin(tenant_id)
    and tenant_id in (select public.security_user_tenant_ids())
  )
  with check (
    public.security_is_super_admin(tenant_id)
    and tenant_id in (select public.security_user_tenant_ids())
  );

-- ─── Revoke cross-tenant anon reads on monetization (API uses service role) ───

drop policy if exists "Public read monetization placements" on public.monetization_placements;
drop policy if exists "Public read sponsored stories" on public.sponsored_stories;
drop policy if exists "Public read reader plans" on public.reader_plans;
drop policy if exists "Public read premium reports" on public.premium_reports;
drop policy if exists "Public read newsletters" on public.newsletters;
drop policy if exists "Public read affiliate placements" on public.affiliate_placements;

-- ─── Harden generated_articles: published content only for anon ───

drop policy if exists "Public read generated articles" on public.generated_articles;
create policy "Public read published generated articles"
  on public.generated_articles for select to anon, authenticated
  using (
    published_at is not null
    and coalesce(editorial_status, 'approved') in ('approved', 'published', 'live')
  );

-- ─── Platform tables: explicit service_role + scoped public read ───

drop policy if exists "Service role platform_article_sources" on public.platform_article_sources;
create policy "Service role platform_article_sources"
  on public.platform_article_sources for all to service_role
  using (true) with check (true);

drop policy if exists "Service role platform_ai_logs" on public.platform_ai_logs;
create policy "Service role platform_ai_logs"
  on public.platform_ai_logs for all to service_role
  using (true) with check (true);

-- Restrict platform read policies to anon + authenticated explicitly
drop policy if exists "Public read platform articles" on public.platform_articles;
create policy "Public read platform articles"
  on public.platform_articles for select to anon, authenticated
  using (true);

drop policy if exists "Public read platform districts" on public.platform_districts;
create policy "Public read platform districts"
  on public.platform_districts for select to anon, authenticated
  using (enabled = true);

drop policy if exists "Public read platform topics" on public.platform_topics;
create policy "Public read platform topics"
  on public.platform_topics for select to anon, authenticated
  using (enabled = true);

drop policy if exists "Public read platform breaking news" on public.platform_breaking_news;
create policy "Public read platform breaking news"
  on public.platform_breaking_news for select to anon, authenticated
  using (is_active = true);

-- ─── Revoke public execute on intelligence RPC from anon ───

revoke execute on function public.match_intelligence_embeddings(vector, int, text, uuid) from anon;
grant execute on function public.match_intelligence_embeddings(vector, int, text, uuid) to authenticated, service_role;
