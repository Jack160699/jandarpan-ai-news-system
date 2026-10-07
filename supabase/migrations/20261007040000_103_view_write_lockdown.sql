-- Migration 103: views created by 100/101 inherited Supabase's default ALL privileges for authenticated.
--
-- user_news_moderation_for_author is a simple, owner-privileged view: it is auto-updatable, so INSERT/UPDATE/DELETE through it would run
-- against user_news_moderation WITHOUT row-level security. The append-only trigger and NOT NULL columns happened to stop every write today, but
-- "a constraint happens to stop it" is not a security boundary. Views here are read-only by design: SELECT only, for signed-in users only.
-- Idempotent.
revoke all on public.user_news_moderation_for_author from public, anon;
revoke insert, update, delete, truncate, references, trigger on public.user_news_moderation_for_author from authenticated;
grant select on public.user_news_moderation_for_author to authenticated;

revoke all on public.publisher_revenue_balances from public, anon;
revoke insert, update, delete, truncate, references, trigger on public.publisher_revenue_balances from authenticated;
grant select on public.publisher_revenue_balances to authenticated;
