-- Reader monetization: ads, sponsorships, memberships, newsletters, affiliates

create table if not exists monetization_placements (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references newsroom_tenants(id) on delete cascade,
  slot_id text not null,
  placement_type text not null default 'display'
    check (placement_type in ('display', 'html', 'house', 'affiliate', 'newsletter', 'membership')),
  label text,
  enabled boolean not null default true,
  priority int not null default 0,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, slot_id, priority)
);

create index if not exists idx_monetization_placements_tenant
  on monetization_placements (tenant_id, enabled);

create table if not exists sponsored_stories (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references newsroom_tenants(id) on delete cascade,
  article_slug text not null,
  sponsor_name text not null,
  sponsor_logo_url text,
  disclosure_en text not null default 'Sponsored content',
  disclosure_hi text default 'प्रायोजित सामग्री',
  cta_url text,
  cta_label text,
  active_from timestamptz default now(),
  active_until timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_sponsored_stories_slug
  on sponsored_stories (tenant_id, article_slug);

create table if not exists reader_plans (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references newsroom_tenants(id) on delete cascade,
  slug text not null,
  name_en text not null,
  name_hi text,
  price_inr int not null default 0,
  billing_interval text not null default 'month'
    check (billing_interval in ('month', 'year', 'one_time')),
  features jsonb not null default '[]'::jsonb,
  stripe_price_id text,
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (tenant_id, slug)
);

create table if not exists reader_subscriptions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references newsroom_tenants(id) on delete cascade,
  plan_id uuid references reader_plans(id) on delete set null,
  email text not null,
  status text not null default 'active'
    check (status in ('trialing', 'active', 'canceled', 'past_due')),
  stripe_customer_id text,
  stripe_subscription_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_reader_subscriptions_tenant_email
  on reader_subscriptions (tenant_id, email);

create table if not exists premium_reports (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references newsroom_tenants(id) on delete cascade,
  slug text not null,
  title text not null,
  excerpt text,
  hero_image_url text,
  price_inr int not null default 0,
  is_paywalled boolean not null default true,
  content_path text,
  published_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (tenant_id, slug)
);

create table if not exists newsletters (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references newsroom_tenants(id) on delete cascade,
  slug text not null,
  name_en text not null,
  name_hi text,
  frequency text not null default 'weekly',
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (tenant_id, slug)
);

create table if not exists newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  newsletter_id uuid not null references newsletters(id) on delete cascade,
  email text not null,
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'unsubscribed')),
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (newsletter_id, email)
);

create table if not exists affiliate_placements (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references newsroom_tenants(id) on delete cascade,
  slot_id text not null,
  partner_name text not null,
  title text not null,
  description text,
  image_url text,
  target_url text not null,
  disclosure_en text default 'Affiliate link',
  disclosure_hi text default 'सहबद्ध लिंक',
  enabled boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_affiliate_placements_tenant_slot
  on affiliate_placements (tenant_id, slot_id, enabled);

create table if not exists monetization_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references newsroom_tenants(id) on delete set null,
  event_type text not null,
  slot_id text,
  placement_type text,
  article_slug text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_monetization_events_tenant_created
  on monetization_events (tenant_id, created_at desc);

comment on table monetization_placements is 'Configurable ad and promo slots per tenant';
comment on table monetization_events is 'Impression/click analytics for monetization units';
