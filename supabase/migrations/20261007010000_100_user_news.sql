-- Migration 100: verified user news ("Post News"), identity-verification RESULTS, moderation, media, append-only audit.
--
-- Design rules (each is enforced IN THE DATABASE, not only in application code):
--   1. Users never write their own state. RLS gives an author SELECT on their own rows and nothing else; every write goes through the
--      server API (service_role) after it re-checks verification, ownership and the allowed transition.
--   2. A story cannot reach moderation without a recorded explicit user approval (CHECK user_news_requires_user_approval).
--   3. Status can only change along the state machine (trigger), even if server code has a bug.
--   4. 'published' requires a published article; 'verified' requires a verified_at.
--   5. History / audit tables are append-only (UPDATE and DELETE are rejected).
--   6. NO identity numbers, OTPs, biometrics or documents are stored anywhere: user_verification holds a result and an opaque reference.
-- Additive and idempotent. Nothing here touches generated_articles or any existing table's data.

-- ---------------------------------------------------------------------------------------------------------------------
-- helpers
-- ---------------------------------------------------------------------------------------------------------------------
create or replace function public.platform_reject_mutation()
returns trigger language plpgsql as $$
begin
  raise exception '% is append-only: % is not allowed', tg_table_name, tg_op using errcode = '42501';
end;
$$;

create or replace function public.platform_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------------------------------------------------
-- identity verification: a RESULT, never identity data
-- ---------------------------------------------------------------------------------------------------------------------
create table if not exists public.user_verification (
  user_id            uuid primary key references auth.users (id) on delete cascade,
  status             text not null default 'unverified'
                     check (status in ('unverified', 'pending', 'verified', 'rejected', 'expired', 'revoked')),
  provider           text,
  provider_reference text,
  verified_at        timestamptz,
  expires_at         timestamptz,
  consent_version    text,
  consent_at         timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint user_verification_verified_has_time check (status <> 'verified' or verified_at is not null),
  constraint user_verification_expiry_after_verification check (expires_at is null or verified_at is null or expires_at > verified_at)
);
comment on table public.user_verification is
  'Identity-verification RESULT only (status, provider, opaque reference, timestamps, consent). Must never contain an Aadhaar number, OTP, biometric or identity document.';
drop trigger if exists user_verification_touch on public.user_verification;
create trigger user_verification_touch before update on public.user_verification
  for each row execute function public.platform_touch_updated_at();

create table if not exists public.user_verification_events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  from_status text,
  to_status   text not null,
  actor_kind  text not null check (actor_kind in ('provider', 'admin', 'system')),
  actor_id    uuid,
  provider    text,
  reference   text,
  detail      jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists user_verification_events_user_idx on public.user_verification_events (user_id, created_at desc);
drop trigger if exists user_verification_events_append_only on public.user_verification_events;
create trigger user_verification_events_append_only before update or delete on public.user_verification_events
  for each row execute function public.platform_reject_mutation();

-- ---------------------------------------------------------------------------------------------------------------------
-- submissions
-- ---------------------------------------------------------------------------------------------------------------------
create table if not exists public.user_news_submissions (
  id                    uuid primary key default gen_random_uuid(),
  author_id             uuid not null references auth.users (id) on delete restrict,
  status                text not null default 'draft'
                        check (status in ('draft', 'ai_generated', 'user_approved', 'submitted', 'under_review', 'approved', 'published', 'rejected', 'blocked', 'withdrawn')),
  language              text not null check (language in ('hi', 'en')),
  input_kind            text not null check (input_kind in ('text', 'voice', 'text_and_voice')),
  raw_text              text,
  transcript            text,
  headline              text,
  subheadline           text,
  summary               text,
  body                  text,
  location_text         text,
  declared_district     text,
  moderator_confirmed_district text,
  geo                   jsonb not null default '{}'::jsonb,
  category              text,
  tags                  text[] not null default '{}',
  fact_flags            jsonb not null default '[]'::jsonb,
  risk_flags            jsonb not null default '[]'::jsonb,
  ai_meta               jsonb not null default '{}'::jsonb,
  also_publish_language text check (also_publish_language in ('hi', 'en')),
  version               integer not null default 1,
  user_approved_at      timestamptz,
  submitted_at          timestamptz,
  reviewed_at           timestamptz,
  reviewer_id           uuid,
  published_at          timestamptz,
  published_article_id  uuid,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  -- RULE 2: nothing reaches moderation without the author's explicit, recorded approval
  constraint user_news_requires_user_approval
    check (status not in ('submitted', 'under_review', 'approved', 'published') or user_approved_at is not null),
  -- RULE 4
  constraint user_news_published_has_article check (status <> 'published' or published_article_id is not null),
  constraint user_news_text_cap check (coalesce(length(raw_text), 0) <= 12000 and coalesce(length(transcript), 0) <= 12000 and coalesce(length(body), 0) <= 12000)
);
comment on table public.user_news_submissions is
  'A verified user''s news submission. AI-assisted drafts are DRAFTS: the author must approve, then a moderator decides. Writes only via the server API.';
create index if not exists user_news_submissions_author_idx on public.user_news_submissions (author_id, created_at desc);
create index if not exists user_news_submissions_queue_idx on public.user_news_submissions (status, submitted_at) where status in ('submitted', 'under_review', 'approved');
create unique index if not exists user_news_submissions_article_uidx on public.user_news_submissions (published_article_id) where published_article_id is not null;
drop trigger if exists user_news_submissions_touch on public.user_news_submissions;
create trigger user_news_submissions_touch before update on public.user_news_submissions
  for each row execute function public.platform_touch_updated_at();

-- RULE 3: the union of every actor's allowed moves (mirrors src/lib/user-news/status-machine.ts; a test keeps the two in sync).
create or replace function public.user_news_transition_allowed(p_from text, p_to text)
returns boolean language sql immutable as $$
  select exists (
    select 1 from (values
      ('draft', 'ai_generated'), ('draft', 'withdrawn'),
      ('ai_generated', 'user_approved'), ('ai_generated', 'withdrawn'),
      ('user_approved', 'ai_generated'), ('user_approved', 'submitted'), ('user_approved', 'withdrawn'),
      ('submitted', 'under_review'), ('submitted', 'withdrawn'),
      ('under_review', 'approved'), ('under_review', 'rejected'), ('under_review', 'blocked'), ('under_review', 'ai_generated'), ('under_review', 'withdrawn'),
      ('approved', 'published'), ('approved', 'rejected'), ('approved', 'blocked'), ('approved', 'withdrawn'),
      ('published', 'blocked'), ('published', 'withdrawn')
    ) as t (f, to_status) where t.f = p_from and t.to_status = p_to
  );
$$;

create or replace function public.user_news_status_guard()
returns trigger language plpgsql as $$
begin
  if new.status is distinct from old.status then
    if not public.user_news_transition_allowed(old.status, new.status) then
      raise exception 'user_news: invalid status transition % -> %', old.status, new.status using errcode = '23514';
    end if;
    -- sending a story back for edits clears the approval: the author must approve the new text again
    if new.status = 'ai_generated' and old.status in ('under_review', 'user_approved') then
      new.user_approved_at := null;
      new.submitted_at := null;
    end if;
  end if;
  -- the author-owned columns can never change owner
  if new.author_id is distinct from old.author_id then
    raise exception 'user_news: author_id is immutable' using errcode = '23514';
  end if;
  return new;
end;
$$;
drop trigger if exists user_news_status_guard_trg on public.user_news_submissions;
create trigger user_news_status_guard_trg before update on public.user_news_submissions
  for each row execute function public.user_news_status_guard();

-- append-only history of every text version
create table if not exists public.user_news_revisions (
  id            uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.user_news_submissions (id) on delete cascade,
  version       integer not null,
  kind          text not null check (kind in ('source', 'transcript', 'ai_draft', 'user_edit', 'moderator_edit', 'translation')),
  actor_id      uuid,
  snapshot      jsonb not null,
  created_at    timestamptz not null default now(),
  unique (submission_id, version, kind)
);
create index if not exists user_news_revisions_submission_idx on public.user_news_revisions (submission_id, created_at);
drop trigger if exists user_news_revisions_append_only on public.user_news_revisions;
create trigger user_news_revisions_append_only before update or delete on public.user_news_revisions
  for each row execute function public.platform_reject_mutation();

-- append-only moderation decisions
create table if not exists public.user_news_moderation (
  id            uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.user_news_submissions (id) on delete cascade,
  moderator_id  uuid not null,
  decision      text not null check (decision in ('approve', 'reject', 'request_edit', 'hold', 'block', 'unpublish', 'confirm_district')),
  reason_code   text,
  reason_text   text,
  flags         jsonb not null default '[]'::jsonb,
  created_at    timestamptz not null default now(),
  constraint user_news_moderation_reject_needs_reason check (decision not in ('reject', 'block', 'request_edit', 'unpublish') or coalesce(length(trim(reason_text)), 0) >= 5)
);
create index if not exists user_news_moderation_submission_idx on public.user_news_moderation (submission_id, created_at);
drop trigger if exists user_news_moderation_append_only on public.user_news_moderation;
create trigger user_news_moderation_append_only before update or delete on public.user_news_moderation
  for each row execute function public.platform_reject_mutation();

-- media (originals are private; readers only ever see the re-encoded derivative)
create table if not exists public.user_news_media (
  id                uuid primary key default gen_random_uuid(),
  submission_id     uuid not null references public.user_news_submissions (id) on delete cascade,
  owner_id          uuid not null references auth.users (id) on delete restrict,
  kind              text not null check (kind in ('image', 'video', 'voice')),
  storage_path      text not null unique,
  optimized_path    text,
  thumbnail_path    text,
  original_mime     text not null,
  size_bytes        bigint not null check (size_bytes > 0),
  width             integer,
  height            integer,
  duration_ms       integer,
  checksum_sha256   text,
  processing_status text not null default 'pending' check (processing_status in ('pending', 'processing', 'ready', 'failed', 'rejected')),
  validation        jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists user_news_media_submission_idx on public.user_news_media (submission_id);
drop trigger if exists user_news_media_touch on public.user_news_media;
create trigger user_news_media_touch before update on public.user_news_media
  for each row execute function public.platform_touch_updated_at();

-- ---------------------------------------------------------------------------------------------------------------------
-- append-only audit trail for every important platform action (verification, submission, edits, moderation, publication,
-- takedown, revenue adjustments, payouts, admin actions)
-- ---------------------------------------------------------------------------------------------------------------------
create table if not exists public.platform_audit_events (
  id          bigint generated always as identity primary key,
  actor_id    uuid,
  actor_kind  text not null check (actor_kind in ('user', 'moderator', 'admin', 'provider', 'system')),
  action      text not null,
  entity_type text not null,
  entity_id   text not null,
  detail      jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists platform_audit_entity_idx on public.platform_audit_events (entity_type, entity_id, created_at desc);
create index if not exists platform_audit_actor_idx on public.platform_audit_events (actor_id, created_at desc);
drop trigger if exists platform_audit_events_append_only on public.platform_audit_events;
create trigger platform_audit_events_append_only before update or delete on public.platform_audit_events
  for each row execute function public.platform_reject_mutation();

-- ---------------------------------------------------------------------------------------------------------------------
-- RLS: authors may READ their own rows; nobody but the server (service_role) can write
-- ---------------------------------------------------------------------------------------------------------------------
alter table public.user_verification enable row level security;
alter table public.user_verification_events enable row level security;
alter table public.user_news_submissions enable row level security;
alter table public.user_news_revisions enable row level security;
alter table public.user_news_moderation enable row level security;
alter table public.user_news_media enable row level security;
alter table public.platform_audit_events enable row level security;

drop policy if exists user_verification_select_own on public.user_verification;
create policy user_verification_select_own on public.user_verification for select to authenticated using (auth.uid() = user_id);

drop policy if exists user_verification_events_select_own on public.user_verification_events;
create policy user_verification_events_select_own on public.user_verification_events for select to authenticated using (auth.uid() = user_id);

drop policy if exists user_news_submissions_select_own on public.user_news_submissions;
create policy user_news_submissions_select_own on public.user_news_submissions for select to authenticated using (auth.uid() = author_id);

drop policy if exists user_news_revisions_select_own on public.user_news_revisions;
create policy user_news_revisions_select_own on public.user_news_revisions for select to authenticated
  using (exists (select 1 from public.user_news_submissions s where s.id = submission_id and s.author_id = auth.uid()));

drop policy if exists user_news_media_select_own on public.user_news_media;
create policy user_news_media_select_own on public.user_news_media for select to authenticated using (auth.uid() = owner_id);

-- service_role full access (it bypasses RLS, but an explicit policy documents intent)
do $$
declare t text;
begin
  foreach t in array array['user_verification', 'user_verification_events', 'user_news_submissions', 'user_news_revisions', 'user_news_moderation', 'user_news_media', 'platform_audit_events']
  loop
    execute format('drop policy if exists %I on public.%I', t || '_service_role', t);
    execute format('create policy %I on public.%I for all to service_role using (true) with check (true)', t || '_service_role', t);
  end loop;
end $$;

-- anon gets nothing on any of these tables; authenticated only the SELECT policies above
revoke all on public.user_verification, public.user_verification_events, public.user_news_submissions, public.user_news_revisions,
              public.user_news_moderation, public.user_news_media, public.platform_audit_events from anon;
revoke insert, update, delete, truncate on public.user_verification, public.user_verification_events, public.user_news_submissions,
              public.user_news_revisions, public.user_news_moderation, public.user_news_media, public.platform_audit_events from authenticated;
revoke all on public.user_news_moderation, public.platform_audit_events from authenticated;

-- What an author may see of moderation: the decision and the reason, never the moderator's identity.
create or replace view public.user_news_moderation_for_author as
  select m.id, m.submission_id, m.decision, m.reason_code, m.reason_text, m.created_at
    from public.user_news_moderation m
   where exists (select 1 from public.user_news_submissions s where s.id = m.submission_id and s.author_id = auth.uid());
revoke all on public.user_news_moderation_for_author from anon;
grant select on public.user_news_moderation_for_author to authenticated;

-- ---------------------------------------------------------------------------------------------------------------------
-- private storage for submitted media (signed upload / signed read URLs only; no storage policies for end users)
-- ---------------------------------------------------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'user-news-media', 'user-news-media', false, 104857600,
  array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm', 'audio/webm', 'audio/ogg', 'audio/wav', 'audio/mpeg']
)
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------------------------------------------------------------
-- My News metrics: the SAME engagement tables the rest of the platform uses (no second analytics store)
-- ---------------------------------------------------------------------------------------------------------------------
create or replace function public.user_news_my_stats(p_author uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with mine as (
    select s.id as submission_id, s.published_article_id as article_id, s.published_at
      from public.user_news_submissions s
     where s.author_id = p_author and s.status = 'published' and s.published_article_id is not null
  ),
  ids as (select article_id::text as sid, submission_id, published_at from mine),
  tot as (select ec.story_id, ec.views_count, ec.likes_count, ec.comments_count from public.story_engagement_counts ec join ids on ids.sid = ec.story_id),
  v_today as (select story_id, count(*) n from public.story_views_log where created_at >= date_trunc('day', now() at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata' and story_id in (select sid from ids) group by 1),
  v_week as (select story_id, count(*) n from public.story_views_log where created_at >= now() - interval '7 days' and story_id in (select sid from ids) group by 1),
  v_uniq as (select story_id, count(distinct coalesce(user_id, play_cycle_id)) n from public.story_views_log where story_id in (select sid from ids) group by 1)
  select coalesce(jsonb_agg(jsonb_build_object(
    'submission_id', ids.submission_id,
    'article_id', ids.sid,
    'published_at', ids.published_at,
    'views_total', coalesce(tot.views_count, 0),
    'likes_total', coalesce(tot.likes_count, 0),
    'comments_total', coalesce(tot.comments_count, 0),
    'views_today', coalesce(v_today.n, 0),
    'views_7d', coalesce(v_week.n, 0),
    'unique_viewers', coalesce(v_uniq.n, 0),
    'engagement_rate_pct', case when coalesce(tot.views_count, 0) > 0
        then round(100.0 * (coalesce(tot.likes_count, 0) + coalesce(tot.comments_count, 0)) / tot.views_count, 1) end
  ) order by ids.published_at desc), '[]'::jsonb)
  from ids
  left join tot on tot.story_id = ids.sid
  left join v_today on v_today.story_id = ids.sid
  left join v_week on v_week.story_id = ids.sid
  left join v_uniq on v_uniq.story_id = ids.sid;
$$;
revoke all on function public.user_news_my_stats(uuid) from public, anon, authenticated;
grant execute on function public.user_news_my_stats(uuid) to service_role;
