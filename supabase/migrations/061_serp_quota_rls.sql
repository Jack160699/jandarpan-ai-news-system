-- Phase 23B — RLS hardening for SERP quota tables (security gap in 060)

alter table public.serp_quota_usage enable row level security;
alter table public.serp_quota_log enable row level security;

drop policy if exists "serp_quota_usage_service_role" on public.serp_quota_usage;
create policy "serp_quota_usage_service_role"
  on public.serp_quota_usage for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "serp_quota_log_service_role" on public.serp_quota_log;
create policy "serp_quota_log_service_role"
  on public.serp_quota_log for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
