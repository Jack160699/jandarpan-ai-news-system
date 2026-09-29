-- Migration 087: article audio (Google Gemini-TTS / Chirp 3 HD) — dedicated table + private bucket
--
-- Audio lives in its own table, not in generated_articles: generation is asynchronous, retried,
-- costed and monitored per attempt. A failed/slow TTS call never touches article publication.
-- One row per (article, language, script kind, style, voice model, voice name) — the unique
-- constraint prevents duplicate generation for the same voice configuration.
--
-- Storage: private bucket "article-audio". Objects are never public; playback is through
-- /api/audio/* which issues short-lived signed URLs after checking the article is public.

create table if not exists public.article_audio (
  id                  uuid primary key default gen_random_uuid(),
  article_id          uuid not null references public.generated_articles(id) on delete cascade,
  language            text not null check (language in ('hi-IN', 'en-IN')),
  script_kind         text not null check (script_kind in ('radio', 'tv', 'short_bulletin')),
  style               text not null check (style in (
                        'breaking_news', 'urgency', 'standard_bulletin', 'serious_report',
                        'human_interest', 'sports', 'weather', 'explainer')),
  voice_model         text not null,
  voice_name          text not null,
  script              text not null,
  script_hash         text not null,
  status              text not null default 'pending'
                        check (status in ('pending', 'generating', 'ready', 'failed', 'invalid')),
  storage_path        text,
  duration_ms         integer,
  characters          integer,
  estimated_cost_usd  numeric(10, 6),
  latency_ms          integer,
  provider            text,
  provider_request_id text,
  attempts            integer not null default 0,
  next_attempt_at     timestamptz,
  error               text,
  validation          jsonb,
  metadata            jsonb,
  generated_at        timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint article_audio_unique_config
    unique (article_id, language, script_kind, style, voice_model, voice_name)
);

create index if not exists article_audio_article_idx on public.article_audio (article_id, language);
create index if not exists article_audio_work_idx
  on public.article_audio (next_attempt_at nulls first, created_at)
  where status in ('pending', 'failed');
create index if not exists article_audio_status_time_idx on public.article_audio (status, updated_at desc);

alter table public.article_audio enable row level security;
-- No anon/authenticated policies: service role only.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('article-audio', 'article-audio', false, 10485760, array['audio/mpeg'])
on conflict (id) do update
  set public = false, file_size_limit = 10485760, allowed_mime_types = array['audio/mpeg'];

-- Claim jobs safely (SKIP LOCKED) with retry backoff; stuck 'generating' rows are reclaimed.
create or replace function public.claim_audio_jobs(p_limit integer default 4, p_stuck_minutes integer default 10)
returns setof public.article_audio
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.article_audio
     set status = 'pending', updated_at = now(),
         next_attempt_at = now() + make_interval(secs => least(3600, 60 * power(2, greatest(attempts - 1, 0))::integer))
   where status = 'generating' and updated_at < now() - make_interval(mins => p_stuck_minutes);

  return query
  with candidates as (
    select id from public.article_audio
     where status in ('pending', 'failed')
       and attempts < 5
       and (next_attempt_at is null or next_attempt_at <= now())
     order by created_at desc          -- freshest stories first
     limit greatest(p_limit, 1)
     for update skip locked
  )
  update public.article_audio a
     set status = 'generating', attempts = a.attempts + 1, updated_at = now()
    from candidates c
   where a.id = c.id
  returning a.*;
end;
$$;

revoke all on function public.claim_audio_jobs(integer, integer) from public, anon, authenticated;
grant execute on function public.claim_audio_jobs(integer, integer) to service_role;

-- Monitoring snapshot for the admin voice panel.
create or replace function public.admin_voice_snapshot()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'by_status', (select coalesce(jsonb_object_agg(status, n), '{}'::jsonb)
                    from (select status, count(*) n from public.article_audio group by 1) s),
    'last_24h', (select jsonb_build_object(
                   'generated', count(*) filter (where status = 'ready'),
                   'failed', count(*) filter (where status in ('failed', 'invalid')),
                   'characters', coalesce(sum(characters) filter (where status = 'ready'), 0),
                   'estimated_cost_usd', coalesce(round(sum(estimated_cost_usd) filter (where status = 'ready'), 4), 0),
                   'avg_latency_ms', round(avg(latency_ms) filter (where status = 'ready')),
                   'avg_duration_ms', round(avg(duration_ms) filter (where status = 'ready')))
                  from public.article_audio where updated_at > now() - interval '24 hours'),
    'by_provider_24h', (select coalesce(jsonb_agg(row_to_json(p)), '[]'::jsonb) from (
        select coalesce(provider, 'none') provider, voice_model,
               count(*) filter (where status = 'ready') ready,
               count(*) filter (where status in ('failed', 'invalid')) failed,
               round(avg(latency_ms) filter (where status = 'ready')) avg_latency_ms,
               round(sum(estimated_cost_usd) filter (where status = 'ready'), 4) cost_usd
          from public.article_audio where updated_at > now() - interval '24 hours'
         group by 1, 2) p),
    'failure_reasons', (select coalesce(jsonb_agg(row_to_json(f)), '[]'::jsonb) from (
        select left(coalesce(error, 'unknown'), 90) reason, count(*) n
          from public.article_audio where status in ('failed', 'invalid') and updated_at > now() - interval '7 days'
         group by 1 order by 2 desc limit 8) f),
    'recent', (select coalesce(jsonb_agg(row_to_json(r)), '[]'::jsonb) from (
        select a.id, a.article_id, g.headline, a.language, a.script_kind, a.style, a.status, a.provider,
               a.voice_model, a.voice_name, a.duration_ms, a.latency_ms, a.characters, a.attempts,
               left(a.error, 120) error, a.updated_at
          from public.article_audio a join public.generated_articles g on g.id = a.article_id
         order by a.updated_at desc limit 12) r),
    'pending_articles', (select count(*) from public.generated_articles g
        where g.published_at > now() - interval '24 hours'
          and g.editorial_status in ('approved', 'published', 'live')
          and not exists (select 1 from public.article_audio a where a.article_id = g.id))
  )
$$;

revoke all on function public.admin_voice_snapshot() from public, anon, authenticated;
grant execute on function public.admin_voice_snapshot() to service_role;

comment on table public.article_audio is
  'Generated news audio (Google Gemini-TTS primary, Chirp 3 HD fallback). Files live in the private storage bucket article-audio.';
