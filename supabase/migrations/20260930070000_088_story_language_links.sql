-- Migration 088: cross-language story identity (ONE event -> multiple language representations)
--
-- The same real-world story arrived as unrelated hi/en events because clustering runs per ingestion
-- batch on lexical + in-batch embedding similarity, and exact-string dedupe cannot see across
-- scripts. Multilingual embeddings (Cloudflare bge-m3, 1024-d — the same model the clusterer
-- already uses) place a Hindi and an English headline of one story close together.
--
-- Published articles are embedded into the existing intelligence_embeddings_cf table
-- (entity_type = 'article'); candidate events are matched against recent articles.
-- Every decision is recorded in story_language_links so thresholds can be calibrated from real
-- data in `shadow` mode before `enforce` is switched on (CROSS_LANG_DEDUPE_MODE).

create table if not exists public.story_language_links (
  id                uuid primary key default gen_random_uuid(),
  event_id          uuid,
  candidate_language text,
  matched_article_id uuid references public.generated_articles(id) on delete cascade,
  matched_language  text,
  similarity        real not null,
  decision          text not null check (decision in ('duplicate_same_language', 'cross_language_variant', 'distinct')),
  mode              text not null check (mode in ('shadow', 'enforce')),
  enforced          boolean not null default false,
  created_at        timestamptz not null default now()
);

create index if not exists story_language_links_created_idx on public.story_language_links (created_at desc);
create index if not exists story_language_links_matched_idx on public.story_language_links (matched_article_id);
create unique index if not exists story_language_links_event_unique
  on public.story_language_links (event_id, matched_article_id) where event_id is not null;

alter table public.story_language_links enable row level security;

-- Nearest recent published articles to a candidate embedding (cosine similarity).
create or replace function public.match_recent_story_embeddings(
  p_embedding vector(1024),
  p_since timestamptz,
  p_min_similarity real default 0.75,
  p_limit integer default 5
) returns table (article_id uuid, language text, headline text, similarity real)
language sql
stable
security definer
set search_path = public
as $$
  select g.id, g.language, g.headline, (1 - (e.embedding <=> p_embedding))::real as similarity
    from public.intelligence_embeddings_cf e
    join public.generated_articles g on g.id = e.entity_id
   where e.entity_type = 'article'
     and g.published_at >= p_since
     and g.editorial_status in ('approved', 'published', 'live')
     and (1 - (e.embedding <=> p_embedding)) >= p_min_similarity
   order by e.embedding <=> p_embedding
   limit greatest(p_limit, 1)
$$;

revoke all on function public.match_recent_story_embeddings(vector, timestamptz, real, integer) from public, anon, authenticated;
grant execute on function public.match_recent_story_embeddings(vector, timestamptz, real, integer) to service_role;

comment on table public.story_language_links is
  'Decisions of the cross-language duplicate detector (shadow = logged only, enforce = candidate skipped).';
