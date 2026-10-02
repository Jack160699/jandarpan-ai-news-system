-- Migration 097: smaller candidate slate (same logic as 096, new default limits).
--
-- The editorial worker reads this slate on every 5-minute wake (288/day). At 84 rows x 1.7 KB it was ~146 KB per wake (~42 MB/day),
-- far more than the worker can use: it attempts at most max(limit*2, 8) candidates per wake. 25 primary + 10 statewide + 6 other + 3
-- updates = 44 rows (~76 KB) still leaves several times the attempt budget, with primary-district events strictly first.

create or replace function public.jd_editorial_candidate_events(
  p_since timestamptz,
  p_primary integer default 25,
  p_cg integer default 10,
  p_other integer default 6,
  p_updates integer default 3,
  p_min_evidence integer default 400
)
returns table (
  grp text,
  id uuid,
  tenant_id uuid,
  canonical_title text,
  event_summary text,
  region text,
  category text,
  urgency_score numeric,
  source_count integer,
  signal_ids uuid[],
  coverage_slug text,
  coverage_headline text,
  cluster_confidence numeric,
  is_live boolean,
  coverage_status text,
  created_at timestamptz,
  updated_at timestamptz,
  evidence_chars integer
)
language sql
stable
as $$
  with recent as (
    select e.*,
           (e.canonical_title ~* '(रायपुर|raipur|दुर्ग|durg|भिलाई|bhilai|बिलासपुर|bilaspur|राजनांदगांव|राजनांदगाँव|rajnandgaon)'
            or coalesce(e.event_summary, '') ~* '(रायपुर|raipur|दुर्ग|durg|भिलाई|bhilai|बिलासपुर|bilaspur|राजनांदगांव|राजनांदगाँव|rajnandgaon)') as primary_match,
           exists (select 1 from public.generated_articles g where g.event_id = e.id) as has_article,
           coalesce((select sum(length(coalesce(s.raw_content, ''))) from public.news_signals s where s.id = any (e.signal_ids)), 0)::int as ev_chars
      from public.news_events e
     where (e.created_at >= p_since or e.updated_at >= p_since)
       and e.coverage_status <> 'superseded'
  ),
  primary_g as (
    select 'primary'::text as g, r.* from recent r
     where not r.has_article and r.primary_match and r.ev_chars >= p_min_evidence
     order by r.updated_at desc, r.id limit greatest(p_primary, 0)
  ),
  cg_g as (
    select 'cg'::text as g, r.* from recent r
     where not r.has_article and not r.primary_match and r.region = 'chhattisgarh' and r.ev_chars >= p_min_evidence
       and (r.source_count >= 2 or r.urgency_score >= 60 or r.is_live)
     order by r.urgency_score desc, r.updated_at desc, r.id limit greatest(p_cg, 0)
  ),
  other_g as (
    select 'other'::text as g, r.* from recent r
     where not r.has_article and not r.primary_match and coalesce(r.region, '') <> 'chhattisgarh' and r.ev_chars >= p_min_evidence
       and (r.source_count >= 2 or r.urgency_score >= 60)
     order by r.urgency_score desc, r.updated_at desc, r.id limit greatest(p_other, 0)
  ),
  updates_g as (
    select 'updates'::text as g, r.* from recent r
     where r.has_article and r.updated_at >= now() - interval '12 hours'
     order by r.updated_at desc, r.id limit greatest(p_updates, 0)
  ),
  unioned as (
    select * from primary_g union all select * from cg_g union all select * from other_g union all select * from updates_g
  )
  select u.g, u.id, u.tenant_id, u.canonical_title, left(u.event_summary, 400), u.region, u.category, u.urgency_score,
         u.source_count, u.signal_ids, u.coverage_slug, u.coverage_headline, u.cluster_confidence, u.is_live,
         u.coverage_status, u.created_at, u.updated_at, u.ev_chars
    from unioned u;
$$;

revoke all on function public.jd_editorial_candidate_events(timestamptz, integer, integer, integer, integer, integer) from public, anon, authenticated;
grant execute on function public.jd_editorial_candidate_events(timestamptz, integer, integer, integer, integer, integer) to service_role;
