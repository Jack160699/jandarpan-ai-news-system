-- Migration 084: slim feed projection for public list pages
--
-- Measured 2026-09-29 (EXPLAIN ANALYZE as anon): the homepage pool query executes in
-- ~1 ms on the 93-row table, so the plan is not the problem — the PAYLOAD is.
-- editorial_metadata averages ~8.8 KB/row (update_checkpoint, quality_report,
-- intelligence_v2, updates, cost/depth diagnostics...) and the list pages only read a
-- handful of its keys. A 300-row pool shipped ~632 kB of JSON through PostgREST;
-- the same rows with only the keys cards actually use are a fraction of that.
--
-- generated_articles_feed exposes the same columns as the list-page projection with a
-- whitelisted editorial_metadata. security_invoker keeps the table's RLS
-- ("Public read published generated articles") in force for anon/authenticated.

-- Keep only the listed keys of a jsonb object (null for non-objects).
create or replace function public.jsonb_pick(j jsonb, keys text[])
returns jsonb
language sql
immutable
parallel safe
as $$
  select case
    when j is null or jsonb_typeof(j) <> 'object' then null
    else (select coalesce(jsonb_object_agg(e.key, e.value), '{}'::jsonb)
            from jsonb_each(j) e where e.key = any (keys))
  end
$$;

create or replace function public.slim_editorial_metadata(m jsonb, keep_translations boolean default false)
returns jsonb
language sql
immutable
parallel safe
as $$
  select coalesce(
    jsonb_strip_nulls(
      jsonb_build_object(
        'hero_media', public.jsonb_pick(m -> 'hero_media', array[
          'media_url','thumbnail_url','source_url','media_type','rights_status','usage_method',
          'caption','width','height','alt','credit']),
        'image', public.jsonb_pick(m -> 'image', array[
          'hero_url','og_url','decision','source','sourceUrl','rights_status','width','height',
          'caption','pending','status','processed_at']),
        'embedded_video', m -> 'embedded_video',
        'media_caption', m -> 'media_caption',
        'media_source_url', m -> 'media_source_url',
        'media_rights_status', m -> 'media_rights_status',
        'ai_confidence', m -> 'ai_confidence',
        'source_count', m -> 'source_count',
        'used_fallback', m -> 'used_fallback',
        'is_breaking', m -> 'is_breaking',
        'breaking_score', m -> 'breaking_score',
        'breaking_override', m -> 'breaking_override',
        'trend_score', m -> 'trend_score',
        'source_attribution', (
          select jsonb_agg(public.jsonb_pick(a.value, array['source','name','provider','published_at']))
            from (select value from jsonb_array_elements(
                    case when jsonb_typeof(m -> 'source_attribution') = 'array' then m -> 'source_attribution' else '[]'::jsonb end
                  ) limit 3) a
        ),
        'source_attribution_text', m -> 'source_attribution_text',
        'quality_breakdown', m -> 'quality_breakdown',
        'quality_report', case
          when m -> 'quality_report' ? 'clickbait_flags'
            then jsonb_build_object('clickbait_flags', m -> 'quality_report' -> 'clickbait_flags')
          else null end,
        'source_published_at', m -> 'source_published_at',
        'translations', case when keep_translations then m -> 'translations' else null end
      )
    ),
    '{}'::jsonb
  )
$$;

create or replace view public.generated_articles_feed
with (security_invoker = true) as
select
  g.id,
  g.event_id,
  g.slug,
  g.headline,
  g.summary,
  g.hero_image_url,
  g.seo_title,
  g.seo_description,
  g.reading_time,
  g.language,
  g.tags,
  g.published_at,
  g.editorial_status,
  g.workflow_status,
  g.homepage_pin,
  g.pinned_at,
  g.geo_metadata,
  coalesce(g.translations, g.editorial_metadata -> 'translations') as translations,
  public.slim_editorial_metadata(g.editorial_metadata, g.translations is null) as editorial_metadata,
  g.created_at
from public.generated_articles g;

grant select on public.generated_articles_feed to anon, authenticated, service_role;

comment on view public.generated_articles_feed is
  'List-page projection of generated_articles with a whitelisted editorial_metadata (see slim_editorial_metadata). security_invoker: RLS of the base table applies.';
