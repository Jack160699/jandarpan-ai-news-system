-- Migration 102: security hardening found by the read-only RLS / privilege audit of 2026-10-07
--
-- Findings (live database, before this migration):
--   * 7 SECURITY DEFINER functions were executable by the anonymous role through /rest/v1/rpc. Five of them WRITE and take the acting user as a
--     plain argument (toggle_story_like, record_story_play, record_story_consumption, add_story_comment) or mutate the AI work queue
--     (sweep_stale_ai_queue(0, n) rejects every pending item). get_user_consumption_batch leaks any user's reading history by id.
--     The application only ever calls them with the SERVICE ROLE (src/app/api/story/*), so no legitimate caller loses access.
--   * Five RLS policies let anon/authenticated write with `true` (story_likes ALL, story_views_log INSERT, user_story_consumption INSERT/UPDATE,
--     story_comments INSERT): anyone could forge or erase engagement for any user, bypassing rate limits, including the numbers contributors
--     will be shown. The app writes these tables only through the service role.
--   * anon holds INSERT/UPDATE/DELETE/TRUNCATE grants on ~158 tables (Supabase default). RLS blocked it, but TRUNCATE is not governed by RLS and
--     "RLS is the only guard" is a single point of failure.
--
-- Deliberately UNTOUCHED: the public grievance form and contact form (anon INSERT with check true), public SELECT policies, the two public
-- buckets (editorial-images, reader-avatars) and claim_founding_membership / founding_offer_status (they derive the user from auth.uid()).
-- Idempotent: every statement is safe to re-run.

-- 1. Server-only functions
do $$
declare
  fn text;
begin
  foreach fn in array array[
    'public.sweep_stale_ai_queue(integer, integer)',
    'public.add_story_comment(text, text, text, text)',
    'public.toggle_story_like(text, text)',
    'public.record_story_play(text, text, text)',
    'public.record_story_consumption(text, text, text)',
    'public.get_user_consumption_batch(text, text[])',
    'public.get_stories_engagement(text[], text)'
  ] loop
    if to_regprocedure(fn) is not null then
      execute format('revoke all on function %s from public, anon, authenticated', fn);
      execute format('grant execute on function %s to service_role', fn);
    end if;
  end loop;
end $$;

-- claim_founding_membership returns auth_required for anon anyway; stop exposing it to anon at all.
do $$
begin
  if to_regprocedure('public.claim_founding_membership(uuid)') is not null then
    revoke all on function public.claim_founding_membership(uuid) from public, anon;
    grant execute on function public.claim_founding_membership(uuid) to authenticated, service_role;
  end if;
end $$;

-- 2. Wide-open write policies (the app writes these tables only as service_role, which bypasses RLS)
drop policy if exists story_likes_manage_public on public.story_likes;
drop policy if exists story_views_log_insert_public on public.story_views_log;
drop policy if exists user_story_consumption_insert_public on public.user_story_consumption;
drop policy if exists user_story_consumption_update_public on public.user_story_consumption;
drop policy if exists story_comments_insert_public on public.story_comments;

-- 3. Least-privilege table grants. anon never writes except the two public forms; nobody but the server truncates or alters triggers.
do $$
declare
  t record;
begin
  for t in
    select c.relname
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind in ('r', 'p')
  loop
    execute format('revoke truncate, trigger, references on public.%I from anon, authenticated', t.relname);
    if t.relname not in ('compliance_grievances', 'stratxcel_contact_messages') then
      execute format('revoke insert, update, delete on public.%I from anon', t.relname);
    end if;
  end loop;
end $$;
