-- Harden SaaS / monetization / analytics tables (service-role writes, selective public reads)

-- newsroom_tenants: public read active tenants (for domain resolution)
alter table public.newsroom_tenants enable row level security;

drop policy if exists "Public read active tenants" on public.newsroom_tenants;
create policy "Public read active tenants"
  on public.newsroom_tenants
  for select
  to anon, authenticated
  using (status = 'active');

drop policy if exists "Service role tenants" on public.newsroom_tenants;
create policy "Service role tenants"
  on public.newsroom_tenants
  for all
  to service_role
  using (true)
  with check (true);

-- Sensitive SaaS tables: service role only
alter table public.tenant_memberships enable row level security;
alter table public.editorial_audit_log enable row level security;
alter table public.tenant_billing enable row level security;
alter table public.tenant_api_requests enable row level security;

drop policy if exists "Service role tenant_memberships" on public.tenant_memberships;
create policy "Service role tenant_memberships"
  on public.tenant_memberships
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "Service role editorial_audit" on public.editorial_audit_log;
create policy "Service role editorial_audit"
  on public.editorial_audit_log
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "Service role tenant_billing" on public.tenant_billing;
create policy "Service role tenant_billing"
  on public.tenant_billing
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "Service role tenant_api_requests" on public.tenant_api_requests;
create policy "Service role tenant_api_requests"
  on public.tenant_api_requests
  for all
  to service_role
  using (true)
  with check (true);

-- Monetization: public read enabled placements / plans; writes service role
alter table public.monetization_placements enable row level security;
alter table public.sponsored_stories enable row level security;
alter table public.reader_plans enable row level security;
alter table public.premium_reports enable row level security;
alter table public.newsletters enable row level security;
alter table public.affiliate_placements enable row level security;
alter table public.reader_subscriptions enable row level security;
alter table public.newsletter_subscribers enable row level security;
alter table public.monetization_events enable row level security;

drop policy if exists "Public read monetization placements" on public.monetization_placements;
create policy "Public read monetization placements"
  on public.monetization_placements
  for select
  to anon, authenticated
  using (enabled = true);

drop policy if exists "Service role monetization placements" on public.monetization_placements;
create policy "Service role monetization placements"
  on public.monetization_placements
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "Public read sponsored stories" on public.sponsored_stories;
create policy "Public read sponsored stories"
  on public.sponsored_stories
  for select
  to anon, authenticated
  using (
    (active_from is null or active_from <= now())
    and
    (active_until is null or active_until >= now())
  );

drop policy if exists "Service role sponsored stories" on public.sponsored_stories;
create policy "Service role sponsored stories"
  on public.sponsored_stories
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "Public read reader plans" on public.reader_plans;
create policy "Public read reader plans"
  on public.reader_plans
  for select
  to anon, authenticated
  using (active = true);

drop policy if exists "Service role reader_plans" on public.reader_plans;
create policy "Service role reader_plans"
  on public.reader_plans
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "Public read premium reports" on public.premium_reports;
create policy "Public read premium reports"
  on public.premium_reports
  for select
  to anon, authenticated
  using (published_at is not null);

drop policy if exists "Service role premium reports" on public.premium_reports;
create policy "Service role premium reports"
  on public.premium_reports
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "Public read newsletters" on public.newsletters;
create policy "Public read newsletters"
  on public.newsletters
  for select
  to anon, authenticated
  using (active = true);

drop policy if exists "Service role newsletters" on public.newsletters;
create policy "Service role newsletters"
  on public.newsletters
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "Public read affiliate placements" on public.affiliate_placements;
create policy "Public read affiliate placements"
  on public.affiliate_placements
  for select
  to anon, authenticated
  using (enabled = true);

drop policy if exists "Service role affiliate placements" on public.affiliate_placements;
create policy "Service role affiliate placements"
  on public.affiliate_placements
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "Service role reader subscriptions" on public.reader_subscriptions;
create policy "Service role reader subscriptions"
  on public.reader_subscriptions
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "Service role newsletter subscribers" on public.newsletter_subscribers;
create policy "Service role newsletter subscribers"
  on public.newsletter_subscribers
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "Service role monetization events" on public.monetization_events;
create policy "Service role monetization events"
  on public.monetization_events
  for all
  to service_role
  using (true)
  with check (true);

-- Analytics: service role only (app uses admin client)
alter table public.reader_analytics_events enable row level security;
alter table public.article_metrics_daily enable row level security;
alter table public.breaking_velocity_snapshots enable row level security;

drop policy if exists "Service role reader analytics" on public.reader_analytics_events;
create policy "Service role reader analytics"
  on public.reader_analytics_events
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "Service role article metrics" on public.article_metrics_daily;
create policy "Service role article metrics"
  on public.article_metrics_daily
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "Service role breaking velocity" on public.breaking_velocity_snapshots;
create policy "Service role breaking velocity"
  on public.breaking_velocity_snapshots
  for all
  to service_role
  using (true)
  with check (true);