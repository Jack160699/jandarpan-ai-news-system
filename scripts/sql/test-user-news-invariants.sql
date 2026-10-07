-- Database-level invariant tests for migration 100 (user news). READ THIS FIRST:
--
--   This script creates throwaway rows and ALWAYS ends in ROLLBACK, so it leaves nothing behind. It can be run against a database
--   where migration 100 is applied. For a database where it is NOT yet applied, wrap it with the migration (the dry-run does this):
--       begin; <migration 100>; <this file without its own begin/rollback>; rollback;
--
--   Every test tries to BREAK a rule and records whether the database refused. Output: one row per test: name | result (PASS/FAIL) | detail.
--   Run:  npx --no-install supabase db query --linked -f scripts/sql/test-user-news-invariants.sql -o table

begin;

create temp table t_results (name text, result text, detail text);
grant all on t_results to public;

do $$
declare
  u1 uuid := gen_random_uuid();
  u2 uuid := gen_random_uuid();
  s1 uuid;
  s2 uuid;
  v_n integer;
  v_msg text;

  procedure_ok boolean;
begin
  insert into auth.users (id, email) values (u1, 'author1-' || u1 || '@invariant.test'), (u2, 'author2-' || u2 || '@invariant.test');

  -- helper pattern: expect_error(name, sql)
  -- 1. cannot jump draft -> published
  insert into public.user_news_submissions (author_id, language, input_kind, raw_text) values (u1, 'hi', 'text', 'x') returning id into s1;
  insert into public.user_news_submissions (author_id, language, input_kind, raw_text) values (u2, 'hi', 'text', 'y') returning id into s2;

  begin
    update public.user_news_submissions set status = 'published' where id = s1;
    insert into t_results values ('draft -> published is refused', 'FAIL', 'update succeeded');
  exception when others then
    insert into t_results values ('draft -> published is refused', 'PASS', sqlerrm);
  end;

  begin
    update public.user_news_submissions set status = 'approved' where id = s1;
    insert into t_results values ('draft -> approved is refused', 'FAIL', 'update succeeded');
  exception when others then
    insert into t_results values ('draft -> approved is refused', 'PASS', sqlerrm);
  end;

  -- 2. cannot reach submitted without the user's recorded approval
  update public.user_news_submissions set status = 'ai_generated' where id = s1;
  update public.user_news_submissions set status = 'user_approved' where id = s1;
  begin
    update public.user_news_submissions set status = 'submitted' where id = s1;  -- user_approved_at is still null
    insert into t_results values ('submit without user_approved_at is refused', 'FAIL', 'update succeeded');
  exception when others then
    insert into t_results values ('submit without user_approved_at is refused', 'PASS', sqlerrm);
  end;

  -- 3. the legitimate path works
  begin
    update public.user_news_submissions set status = 'submitted', user_approved_at = now(), submitted_at = now() where id = s1;
    update public.user_news_submissions set status = 'under_review' where id = s1;
    update public.user_news_submissions set status = 'approved' where id = s1;
    insert into t_results values ('legitimate path submitted -> under_review -> approved works', 'PASS', '');
  exception when others then
    insert into t_results values ('legitimate path submitted -> under_review -> approved works', 'FAIL', sqlerrm);
  end;

  -- 4. published needs a published article
  begin
    update public.user_news_submissions set status = 'published' where id = s1;  -- no published_article_id
    insert into t_results values ('published without an article is refused', 'FAIL', 'update succeeded');
  exception when others then
    insert into t_results values ('published without an article is refused', 'PASS', sqlerrm);
  end;

  -- 5. request-edit clears the approval so the author must approve again
  update public.user_news_submissions set status = 'ai_generated' where id = s2;
  update public.user_news_submissions set status = 'user_approved', user_approved_at = now() where id = s2;
  update public.user_news_submissions set status = 'submitted', submitted_at = now() where id = s2;
  update public.user_news_submissions set status = 'under_review' where id = s2;
  update public.user_news_submissions set status = 'ai_generated' where id = s2;
  select count(*) into v_n from public.user_news_submissions where id = s2 and user_approved_at is null and submitted_at is null;
  insert into t_results values ('request-edit clears user_approved_at and submitted_at', case when v_n = 1 then 'PASS' else 'FAIL' end, '');

  -- 6. author cannot be changed
  begin
    update public.user_news_submissions set author_id = u2 where id = s1;
    insert into t_results values ('author_id is immutable', 'FAIL', 'update succeeded');
  exception when others then
    insert into t_results values ('author_id is immutable', 'PASS', sqlerrm);
  end;

  -- 7. terminal states stay terminal
  update public.user_news_submissions set status = 'rejected' where id = s1;
  begin
    update public.user_news_submissions set status = 'draft' where id = s1;
    insert into t_results values ('rejected is terminal', 'FAIL', 'update succeeded');
  exception when others then
    insert into t_results values ('rejected is terminal', 'PASS', sqlerrm);
  end;

  -- 8. verification: 'verified' needs verified_at
  begin
    insert into public.user_verification (user_id, status) values (u1, 'verified');
    insert into t_results values ('verified without verified_at is refused', 'FAIL', 'insert succeeded');
  exception when others then
    insert into t_results values ('verified without verified_at is refused', 'PASS', sqlerrm);
  end;

  -- 9. append-only tables
  insert into public.platform_audit_events (actor_id, actor_kind, action, entity_type, entity_id) values (u1, 'user', 'test', 'submission', s1::text);
  begin
    update public.platform_audit_events set action = 'tampered' where entity_id = s1::text;
    insert into t_results values ('audit events cannot be updated', 'FAIL', 'update succeeded');
  exception when others then
    insert into t_results values ('audit events cannot be updated', 'PASS', sqlerrm);
  end;
  begin
    delete from public.platform_audit_events where entity_id = s1::text;
    insert into t_results values ('audit events cannot be deleted', 'FAIL', 'delete succeeded');
  exception when others then
    insert into t_results values ('audit events cannot be deleted', 'PASS', sqlerrm);
  end;

  insert into public.user_news_moderation (submission_id, moderator_id, decision, reason_text) values (s1, u2, 'reject', 'does not meet standards');
  begin
    update public.user_news_moderation set decision = 'approve' where submission_id = s1;
    insert into t_results values ('moderation decisions cannot be rewritten', 'FAIL', 'update succeeded');
  exception when others then
    insert into t_results values ('moderation decisions cannot be rewritten', 'PASS', sqlerrm);
  end;
  begin
    insert into public.user_news_moderation (submission_id, moderator_id, decision, reason_text) values (s1, u2, 'reject', '');
    insert into t_results values ('a rejection needs a written reason', 'FAIL', 'insert succeeded');
  exception when others then
    insert into t_results values ('a rejection needs a written reason', 'PASS', sqlerrm);
  end;

  insert into public.user_news_revisions (submission_id, version, kind, actor_id, snapshot) values (s1, 1, 'source', u1, '{"a":1}'::jsonb);
  begin
    delete from public.user_news_revisions where submission_id = s1;
    insert into t_results values ('revision history cannot be deleted', 'FAIL', 'delete succeeded');
  exception when others then
    insert into t_results values ('revision history cannot be deleted', 'PASS', sqlerrm);
  end;

  -- 10. RLS as an authenticated user (u1): reads own, never another author's; cannot write at all
  insert into public.user_verification (user_id, status, verified_at) values (u2, 'verified', now());
  perform set_config('request.jwt.claims', json_build_object('sub', u1, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', u1::text, true);
  execute 'set local role authenticated';

  select count(*) into v_n from public.user_news_submissions;
  insert into t_results values ('authenticated user sees only their own submissions', case when v_n = 1 then 'PASS' else 'FAIL' end, 'visible rows: ' || v_n);

  select count(*) into v_n from public.user_news_submissions where author_id = u2;
  insert into t_results values ('authenticated user cannot read another author''s submission', case when v_n = 0 then 'PASS' else 'FAIL' end, '');

  select count(*) into v_n from public.user_verification where user_id = u2;
  insert into t_results values ('authenticated user cannot read another user''s verification', case when v_n = 0 then 'PASS' else 'FAIL' end, '');

  begin
    insert into public.user_news_submissions (author_id, language, input_kind, raw_text, status) values (u1, 'hi', 'text', 'self-published', 'published');
    insert into t_results values ('authenticated user cannot insert a submission directly', 'FAIL', 'insert succeeded');
  exception when others then
    insert into t_results values ('authenticated user cannot insert a submission directly', 'PASS', sqlerrm);
  end;

  begin
    update public.user_news_submissions set status = 'withdrawn' where author_id = u1;
    get diagnostics v_n = row_count;
    insert into t_results values ('authenticated user cannot update a submission directly', case when v_n = 0 then 'PASS' else 'FAIL' end, 'rows updated: ' || v_n);
  exception when others then
    insert into t_results values ('authenticated user cannot update a submission directly', 'PASS', sqlerrm);
  end;

  begin
    insert into public.user_verification (user_id, status, verified_at) values (u1, 'verified', now());
    insert into t_results values ('a user cannot verify themselves', 'FAIL', 'insert succeeded');
  exception when others then
    insert into t_results values ('a user cannot verify themselves', 'PASS', sqlerrm);
  end;

  begin
    select count(*) into v_n from public.platform_audit_events;
    insert into t_results values ('authenticated user cannot read the audit log', 'FAIL', 'select succeeded');
  exception when others then
    insert into t_results values ('authenticated user cannot read the audit log', 'PASS', sqlerrm);
  end;

  begin
    select count(*) into v_n from public.user_news_moderation;
    insert into t_results values ('authenticated user cannot read raw moderation rows (moderator identity)', 'FAIL', 'select succeeded');
  exception when others then
    insert into t_results values ('authenticated user cannot read raw moderation rows (moderator identity)', 'PASS', sqlerrm);
  end;

  select count(*) into v_n from public.user_news_moderation_for_author;
  insert into t_results values ('author sees their moderation reason through the view', case when v_n = 1 then 'PASS' else 'FAIL' end, 'rows: ' || v_n);

  execute 'reset role';

  -- anon sees nothing
  execute 'set local role anon';
  begin
    select count(*) into v_n from public.user_news_submissions;
    insert into t_results values ('anon cannot read submissions', 'FAIL', 'select succeeded');
  exception when others then
    insert into t_results values ('anon cannot read submissions', 'PASS', sqlerrm);
  end;
  execute 'reset role';
end $$;

select name, result, detail from (
  select 0 as ord, name, result, detail from t_results
  union all
  select 1, 'SUMMARY', count(*) filter (where result = 'PASS') || ' passed / ' || count(*) filter (where result = 'FAIL') || ' failed', '' from t_results
) r order by ord, (result = 'PASS'), name;

rollback;
