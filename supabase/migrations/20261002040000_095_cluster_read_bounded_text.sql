-- Migration 095: bound the text the clusterer downloads per signal.
--
-- Signals now carry the publisher's full feed text (up to 4,000 chars, see feed-fulltext.ts). Clustering only needs the
-- opening of an article to tokenise / embed it, so the cluster read returns the first 2,000 characters. The full text
-- stays in news_signals for the editorial pass, which reads the signals of the ONE event it is generating.
create or replace function public.jd_unclustered_signals(p_since timestamptz, p_limit integer default 120)
returns table (
  id uuid, source text, provider text, title text, raw_content text, article_url text, published_at timestamptz,
  category text, region text, language text, geo_metadata jsonb, created_at timestamptz
)
language sql
stable
as $$
  select s.id, s.source, s.provider, s.title, left(s.raw_content, 2000), s.article_url, s.published_at,
         s.category, s.region, s.language, s.geo_metadata, s.created_at
    from public.news_signals s
   where (s.published_at >= p_since or (s.published_at is null and s.created_at >= p_since))
     and not exists (select 1 from public.news_event_signal_claims c where c.signal_id = s.id)
   order by s.published_at desc nulls last, s.id
   limit greatest(1, least(coalesce(p_limit, 120), 500));
$$;

revoke all on function public.jd_unclustered_signals(timestamptz, integer) from public, anon, authenticated;
grant execute on function public.jd_unclustered_signals(timestamptz, integer) to service_role;
