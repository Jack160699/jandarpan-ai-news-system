-- SaaS client dashboard: memberships, audit, billing, API monitoring

create table if not exists tenant_memberships (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references newsroom_tenants(id) on delete cascade,
  user_id uuid not null,
  email text not null,
  role text not null default 'editor'
    check (role in ('owner', 'admin', 'editor', 'viewer', 'billing')),
  status text not null default 'active'
    check (status in ('active', 'invited', 'suspended')),
  invited_by uuid,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, user_id)
);

create index if not exists idx_tenant_memberships_user
  on tenant_memberships (user_id);

create index if not exists idx_tenant_memberships_tenant
  on tenant_memberships (tenant_id);

create table if not exists editorial_audit_log (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references newsroom_tenants(id) on delete cascade,
  user_id uuid,
  user_email text,
  action text not null,
  resource_type text not null default 'article',
  resource_id text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_editorial_audit_tenant_created
  on editorial_audit_log (tenant_id, created_at desc);

create table if not exists tenant_billing (
  tenant_id uuid primary key references newsroom_tenants(id) on delete cascade,
  plan_id text not null default 'starter',
  plan_status text not null default 'trialing'
    check (plan_status in ('trialing', 'active', 'past_due', 'canceled', 'paused')),
  stripe_customer_id text,
  stripe_subscription_id text,
  articles_limit int not null default 500,
  api_calls_limit int not null default 10000,
  articles_used int not null default 0,
  api_calls_used int not null default 0,
  current_period_start timestamptz,
  current_period_end timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists tenant_api_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references newsroom_tenants(id) on delete set null,
  route text not null,
  method text not null default 'GET',
  status_code int,
  latency_ms int,
  provider text,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_tenant_api_requests_tenant_created
  on tenant_api_requests (tenant_id, created_at desc);

comment on table tenant_memberships is 'SaaS users scoped to a newsroom tenant with RBAC roles';
comment on table tenant_billing is 'Billing-ready plan limits and Stripe IDs per tenant';
comment on table editorial_audit_log is 'Immutable editorial action audit trail';
comment on table tenant_api_requests is 'API monitoring samples per tenant';
