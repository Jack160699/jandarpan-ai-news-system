-- Migration 091: record validated translations as language links.
--
-- story_language_links (088) recorded only the dedupe detector's decisions. A validated hi<->en translation now also
-- writes a 'translation_of' row so the two language representations of one story are linked and auditable in one table.
-- Additive and idempotent: only widens the allowed decision values; existing rows are untouched.

do $$
declare
  c record;
begin
  for c in
    select conname
      from pg_constraint
     where conrelid = 'public.story_language_links'::regclass
       and contype = 'c'
       and pg_get_constraintdef(oid) ilike '%decision%'
  loop
    execute format('alter table public.story_language_links drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.story_language_links
  add constraint story_language_links_decision_check
  check (decision in ('duplicate_same_language', 'cross_language_variant', 'distinct', 'translation_of'));

comment on column public.story_language_links.decision is
  'duplicate_same_language | cross_language_variant | distinct (dedupe detector) | translation_of (validated translation stored on the article).';
