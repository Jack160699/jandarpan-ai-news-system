-- Duplicate remediation: the same police-transfer story published a THIRD time (the early dedupe check scored the mixed-language event text 0.766; the drafted text is 0.948 similar)
-- (two different events, embedding similarity 0.948 vs the 0.88 same-language threshold; the dedupe gate was still
-- in shadow mode). CROSS_LANG_DEDUPE_MODE is now 'enforce' on the Edge workers.
--
--   canonical (KEPT, untouched): 52d4197d-29d9-4e6e-a01d-0c99ae795bbf  published 2026-10-01 18:32:40  event 688fe0b0-...
--   duplicate (HIDDEN):          cced2fb4-019c-483d-a3e3-0724698238eb  published 2026-10-01 20:07:30
--
-- Safe + reversible: nothing is deleted; published_at is preserved; the previous status is recorded in the article's
-- editorial_metadata AND in editorial_audit_log. To restore: set editorial_status='approved', workflow_status='published'
-- on the duplicate (previous values are in editorial_metadata.duplicate_remediation).
-- Guarded: it only acts if the duplicate is still publicly visible, so re-running is a no-op.

begin;

with hidden as (
  update public.generated_articles g
     set editorial_status = 'pending',
         workflow_status = 'draft',
         workflow_rejection_reason = 'duplicate_of:52d4197d-29d9-4e6e-a01d-0c99ae795bbf',
         editorial_metadata = coalesce(g.editorial_metadata, '{}'::jsonb) || jsonb_build_object(
           'duplicate_remediation', jsonb_build_object(
             'canonical_article_id', '52d4197d-29d9-4e6e-a01d-0c99ae795bbf',
             'similarity', 0.948,
             'hidden_at', now(),
             'previous_editorial_status', g.editorial_status,
             'previous_workflow_status', g.workflow_status,
             'published_at_preserved', g.published_at
           ))
   where g.id = 'cced2fb4-019c-483d-a3e3-0724698238eb'
     and g.editorial_status in ('approved', 'published', 'live')
  returning g.id, g.tenant_id, g.event_id
)
insert into public.editorial_audit_log (tenant_id, action, resource_type, resource_id, payload)
select h.tenant_id,
       'duplicate_hidden',
       'generated_article',
       h.id::text,
       jsonb_build_object(
         'canonical_article_id', '52d4197d-29d9-4e6e-a01d-0c99ae795bbf',
         'duplicate_article_id', h.id,
         'duplicate_event_id', h.event_id,
         'similarity', 0.948,
         'threshold_same_language', 0.88,
         'reason', 'same story published twice before CROSS_LANG_DEDUPE_MODE=enforce',
         'reversible', true
       )
  from hidden h;

-- Record the relationship the detector would have recorded (the duplicate's event -> the canonical article).
insert into public.story_language_links (event_id, candidate_language, matched_article_id, matched_language, similarity, decision, mode, enforced)
select '3e0de087-6545-4ca0-8617-1166b91fb58b'::uuid, 'en', '52d4197d-29d9-4e6e-a01d-0c99ae795bbf'::uuid, 'en', 0.948, 'duplicate_same_language', 'enforce', true
 where exists (select 1 from public.generated_articles where id = 'cced2fb4-019c-483d-a3e3-0724698238eb' and editorial_status = 'pending')
on conflict do nothing;

commit;
