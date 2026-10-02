-- Migration 093: list-page feed view stops shipping translated article BODIES.
--
-- Measured 2026-10-02: the homepage pool (160 rows) carried ~121 KB of `translations` of its ~244 KB, almost all of it the
-- translated article_body of every card -- text no list card renders (cards use headline / summary / seo_* / reading_time).
-- Those payloads are read on every ISR regeneration of home, district, category, latest, search, feed and story-related
-- lists, which makes them the largest recurring REST egress.
--
--   * generated_articles_feed        : same columns, `translations` without article_body (list pages)
--   * generated_articles_feed_full   : the previous definition, for the one reader that does use translated bodies
--                                      (the broadcast feed); selected by pool mode "homepage_bodies"
-- Articles themselves are untouched; story pages read the base table with full translations.

create or replace function public.slim_translations(t jsonb)
returns jsonb
language sql
immutable
parallel safe
as $$
  select case
    when t is null or jsonb_typeof(t) <> 'object' then t
    else (select coalesce(jsonb_object_agg(e.key,
                 case when jsonb_typeof(e.value) = 'object' then e.value - 'article_body' else e.value end), '{}'::jsonb)
            from jsonb_each(t) e)
  end
$$;

create or replace view public.generated_articles_feed_full
with (security_invoker = true) as
select
  g.id, g.event_id, g.slug, g.headline, g.summary, g.hero_image_url, g.seo_title, g.seo_description, g.reading_time,
  g.language, g.tags, g.published_at, g.editorial_status, g.workflow_status, g.homepage_pin, g.pinned_at, g.geo_metadata,
  coalesce(g.translations, g.editorial_metadata -> 'translations') as translations,
  public.slim_editorial_metadata(g.editorial_metadata, g.translations is null) as editorial_metadata,
  g.created_at
from public.generated_articles g;

grant select on public.generated_articles_feed_full to anon, authenticated, service_role;

create or replace view public.generated_articles_feed
with (security_invoker = true) as
select
  g.id, g.event_id, g.slug, g.headline, g.summary, g.hero_image_url, g.seo_title, g.seo_description, g.reading_time,
  g.language, g.tags, g.published_at, g.editorial_status, g.workflow_status, g.homepage_pin, g.pinned_at, g.geo_metadata,
  public.slim_translations(coalesce(g.translations, g.editorial_metadata -> 'translations')) as translations,
  public.slim_editorial_metadata(g.editorial_metadata, g.translations is null) as editorial_metadata,
  g.created_at
from public.generated_articles g;

grant select on public.generated_articles_feed to anon, authenticated, service_role;

comment on view public.generated_articles_feed is
  'List-page projection: whitelisted editorial_metadata and translations WITHOUT translated article bodies. security_invoker: RLS of the base table applies.';
comment on view public.generated_articles_feed_full is
  'Same as generated_articles_feed but translations keep article_body (broadcast feed only).';
