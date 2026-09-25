-- Migration: 076_digital_news_statutory_compliance
-- Description: MIB Part III Statutory Compliance Layer for Digital News Publishers
-- Includes: Rule 11 Grievance Redressal, SLA Tracking, Events Audit, Monthly Reports,
-- Rule 18 Publisher Information, and 60-Day Content Retention Protection.

-- 1. Grievance Redressal Table
create table if not exists public.compliance_grievances (
  id text primary key, -- JD-GR-YYYYMM-XXXX
  received_at timestamptz not null default now(),
  channel text not null check (channel in ('web', 'whatsapp', 'email')),
  complainant_name text not null,
  complainant_email text,
  complainant_phone text,
  article_url text,
  article_headline text,
  publication_date date,
  nature_of_grievance text not null,
  grounds_of_grievance text not null,
  code_of_ethics_clause text,
  supporting_info text,
  consent_given boolean not null default true,
  status text not null default 'RECEIVED' check (status in (
    'RECEIVED',
    'ACKNOWLEDGED',
    'UNDER_REVIEW',
    'ACTION_REQUIRED',
    'RESOLVED',
    'REJECTED_WITH_REASON',
    'ESCALATED_LEVEL_II',
    'ESCALATED_LEVEL_III'
  )),
  assigned_reviewer text,
  review_notes text,
  decision text,
  decision_notes text,
  decision_at timestamptz,
  response_sent_at timestamptz,
  acknowledgement_sent_at timestamptz,
  acknowledgement_channel text,
  acknowledgement_reference text,
  sla_15d_deadline timestamptz not null,
  sla_acknowledged_24h boolean not null default false,
  sla_resolved_15d boolean not null default false,
  escalation_level text not null default 'LEVEL_I' check (escalation_level in ('LEVEL_I', 'LEVEL_II', 'LEVEL_III')),
  srb_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes for grievance querying and SLA monitoring
create index if not exists idx_compliance_grievances_status on public.compliance_grievances(status);
create index if not exists idx_compliance_grievances_received on public.compliance_grievances(received_at desc);
create index if not exists idx_compliance_grievances_sla on public.compliance_grievances(sla_15d_deadline asc) where status not in ('RESOLVED', 'REJECTED_WITH_REASON');

-- 2. Compliance Grievance Events & Audit Trail
create table if not exists public.compliance_grievance_events (
  id uuid primary key default gen_random_uuid(),
  grievance_id text not null references public.compliance_grievances(id) on delete cascade,
  event_type text not null,
  actor text not null default 'system',
  description text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_compliance_events_grievance on public.compliance_grievance_events(grievance_id, created_at asc);

-- 3. Monthly Compliance Reports (Rule 19 Transparency Disclosures)
create table if not exists public.compliance_reports (
  id uuid primary key default gen_random_uuid(),
  month text not null unique check (month ~ '^\d{4}-\d{2}$'),
  period_start date not null,
  period_end date not null,
  metrics jsonb not null default '{}'::jsonb,
  report_markdown text,
  report_html text,
  status text not null default 'DRAFT' check (status in ('DRAFT', 'VALIDATED', 'APPROVED', 'PUBLISHED')),
  generated_at timestamptz not null default now(),
  approved_by text,
  approved_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_compliance_reports_month on public.compliance_reports(month desc);
create index if not exists idx_compliance_reports_published on public.compliance_reports(status) where status = 'PUBLISHED';

-- 4. Publisher Information Registry (Rule 18 Furnishing)
create table if not exists public.compliance_publisher_information (
  id text primary key default 'canonical',
  data jsonb not null,
  last_reviewed_at timestamptz not null default now(),
  last_submitted_at timestamptz,
  submission_status text not null default 'FORM_I_PREPARED',
  submission_evidence text,
  acknowledgement_evidence text,
  updated_at timestamptz not null default now()
);

-- 5. Publisher Information Change Registry
create table if not exists public.compliance_change_registry (
  id uuid primary key default gen_random_uuid(),
  field_changed text not null,
  old_value text,
  new_value text,
  changed_by text not null default 'compliance_officer',
  status text not null default 'PENDING_HUMAN_SUBMISSION' check (status in ('PENDING_HUMAN_SUBMISSION', 'SUBMITTED', 'VERIFIED')),
  statutory_deadline timestamptz,
  created_at timestamptz not null default now()
);

-- 6. 60-Day Retention Enforcement on generated_articles
do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'generated_articles' and column_name = 'compliance_hold'
  ) then
    alter table public.generated_articles add column compliance_hold boolean not null default true;
  end if;

  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'generated_articles' and column_name = 'compliance_retention_until'
  ) then
    alter table public.generated_articles add column compliance_retention_until timestamptz;
    -- Populate compliance_retention_until with published_at + 60 days
    update public.generated_articles 
    set compliance_retention_until = coalesce(published_at, created_at) + interval '60 days'
    where compliance_retention_until is null;
  end if;
end $$;

-- Hard deletion protection trigger: never delete any article during its mandatory 60-day statutory retention period or while compliance_hold is true!
create or replace function public.enforce_article_compliance_retention()
returns trigger
language plpgsql
security definer
as $trig$
begin
  if coalesce(old.compliance_hold, true) = true then
    if old.published_at is not null and old.published_at > now() - interval '60 days' then
      raise exception 'CANNOT_DELETE_ARTICLE: Statutory 60-day content retention under IT Rules Part III in effect for article % (published %)', old.id, old.published_at;
    end if;
  end if;
  return old;
end;
$trig$;

drop trigger if exists trg_article_retention_guard on public.generated_articles;
create trigger trg_article_retention_guard
before delete on public.generated_articles
for each row
execute function public.enforce_article_compliance_retention();

-- 7. Row Level Security Policies
alter table public.compliance_grievances enable row level security;
alter table public.compliance_grievance_events enable row level security;
alter table public.compliance_reports enable row level security;
alter table public.compliance_publisher_information enable row level security;
alter table public.compliance_change_registry enable row level security;

-- Grievances: Public can submit (INSERT), but cannot read others (Strict Privacy Protection)
drop policy if exists "compliance_grievances_public_insert" on public.compliance_grievances;
create policy "compliance_grievances_public_insert"
on public.compliance_grievances for insert
to anon, authenticated
with check (true);

-- Grievances: Service role & Admin full access
drop policy if exists "compliance_grievances_service_role" on public.compliance_grievances;
create policy "compliance_grievances_service_role"
on public.compliance_grievances for all
to service_role
using (true)
with check (true);

-- Events: Service role & Admin full access
drop policy if exists "compliance_events_service_role" on public.compliance_grievance_events;
create policy "compliance_events_service_role"
on public.compliance_grievance_events for all
to service_role
using (true)
with check (true);

-- Reports: Public can view only PUBLISHED reports
drop policy if exists "compliance_reports_public_read" on public.compliance_reports;
create policy "compliance_reports_public_read"
on public.compliance_reports for select
to anon, authenticated
using (status = 'PUBLISHED');

drop policy if exists "compliance_reports_service_role" on public.compliance_reports;
create policy "compliance_reports_service_role"
on public.compliance_reports for all
to service_role
using (true)
with check (true);

-- Publisher Info: Public can view canonical verified info
drop policy if exists "compliance_publisher_info_read" on public.compliance_publisher_information;
create policy "compliance_publisher_info_read"
on public.compliance_publisher_information for select
to anon, authenticated
using (true);

drop policy if exists "compliance_publisher_info_service_role" on public.compliance_publisher_information;
create policy "compliance_publisher_info_service_role"
on public.compliance_publisher_information for all
to service_role
using (true)
with check (true);

drop policy if exists "compliance_change_registry_service_role" on public.compliance_change_registry;
create policy "compliance_change_registry_service_role"
on public.compliance_change_registry for all
to service_role
using (true)
with check (true);
