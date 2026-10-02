-- Migration 098: slimmer list-card payload (generated_articles_feed).
--
-- List/hub/home pages read this view; each card needs the headline, summary, hero image, language, tags, timestamps, geo tag, the
-- whitelisted editorial_metadata, and the OTHER language's headline/summary. It does not render seo_title (story pages read the base
-- table), and seo_description is only a fallback for an empty summary. Translations therefore keep only headline / summary /
-- reading_time per language (the broadcast feed reads generated_articles_feed_full, which is unchanged).
-- Same columns, same order, same types: pure payload reduction. editorial_metadata and geo_metadata are intentionally NOT trimmed
-- (ranking and feed isolation read many keys; the saving is not worth the risk).

create or replace function public.slim_translations_cards(t jsonb)
returns jsonb
language sql
immutable
parallel safe
as $$
  select case
    when t is null or jsonb_typeof(t) <> 'object' then t
    else (select coalesce(jsonb_object_agg(e.key,
                 case when jsonb_typeof(e.value) = 'object'
                      then public.jsonb_pick(e.value, array['headline','summary','reading_time'])
                      else e.value end), '{}'::jsonb)
            from jsonb_each(t) e)
  end
$$;

create or replace view public.generated_articles_feed
with (security_invoker = true) as
select
  g.id, g.event_id, g.slug, g.headline, g.summary, g.hero_image_url,
  null::text as seo_title,
  case when coalesce(btrim(g.summary), '') = '' then g.seo_description end as seo_description,
  g.reading_time, g.language, g.tags, g.published_at, g.editorial_status, g.workflow_status, g.homepage_pin, g.pinned_at, g.geo_metadata,
  public.slim_translations_cards(coalesce(g.translations, g.editorial_metadata -> 'translations')) as translations,
  public.slim_editorial_metadata(g.editorial_metadata, g.translations is null) as editorial_metadata,
  g.created_at
from public.generated_articles g;

grant select on public.generated_articles_feed to anon, authenticated, service_role;

comment on view public.generated_articles_feed is
  'List-card projection: no seo_title, seo_description only when summary is empty, translations = headline/summary/reading_time per language, whitelisted editorial_metadata. security_invoker: base-table RLS applies.';
