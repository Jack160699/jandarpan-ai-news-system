-- Migration 104: every public view is read-only for anon and authenticated.
--
-- generated_articles_feed / generated_articles_feed_full are security_invoker views, so RLS and base-table grants (tightened by 102) already
-- stop writes through them. They still carried Supabase's default INSERT/UPDATE/DELETE/TRUNCATE grants, which would silently become live
-- the day someone relaxes a base-table grant. Views are for reading; remove the write grants so that cannot happen. Idempotent.
do $$
declare
  v record;
begin
  for v in
    select c.relname
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind in ('v', 'm')
  loop
    execute format('revoke insert, update, delete, truncate, references, trigger on public.%I from anon, authenticated', v.relname);
  end loop;
end $$;
