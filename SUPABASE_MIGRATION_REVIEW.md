# Supabase migration review

Review date: 2026-05-23  
Scope: `supabase/migrations/001`–`020`

## Summary

| Area | Status | Notes |
|------|--------|-------|
| Core news (`news_articles`) | OK | Public read + service role; indexes present |
| Ingestion / AI queue | OK | Service-role only |
| AI layers (`signals`, `events`, `generated_articles`) | OK | Signals/events locked down; generated public read |
| SaaS tables (017–020) | **High risk** | **No RLS enabled** — anon may read/write if grants allow |
| Policy conflicts | Low | 005/013 use idempotent `drop policy if exists` |
| Missing indexes | Low | Some tenant tables could use composite indexes (non-blocking) |

## Findings

### 1. Critical — SaaS / monetization / analytics tables without RLS (017–020)

**Tables affected:**

- `newsroom_tenants`
- `tenant_memberships`, `editorial_audit_log`, `tenant_billing`, `tenant_api_requests` (018)
- `monetization_placements`, `sponsored_stories`, `reader_plans`, `reader_subscriptions`, `premium_reports`, `newsletters`, `newsletter_subscribers`, `affiliate_placements`, `monetization_events` (019)
- `reader_analytics_events`, `article_metrics_daily`, `breaking_velocity_snapshots` (020)

**Risk:** Supabase exposes the `public` schema to `anon` and `authenticated` roles. Without RLS, PostgREST may allow full table access depending on default grants.

**Fix:** Apply `supabase/migrations/021_saas_rls_hardening.sql` (included in this repo) in the SQL Editor or via CLI.

### 2. Medium — `news_events` policy overlap (007 vs 013)

- **007:** `Service role news_events` — `for all` to `service_role` only.
- **013:** `Public read live news_events` — `for select` when `is_live = true`.

No conflict; policies are complementary. Non-live events remain service-role only.

### 3. Medium — Public read on `coverage_updates` (013)

`using (true)` exposes all coverage updates to anon. Acceptable for a public live-blog product; tighten if updates should be tenant-scoped.

### 4. Low — Duplicate policy names (001 vs 005)

`Public read news articles` is dropped and recreated in 005 — safe and idempotent.

### 5. Low — `Service role full access` on `news_articles` (001)

`for all to service_role` is correct for ingestion. Ensure service role key never ships to the browser (enforced in app via `assertServerOnly`).

### 6. Low — Missing slug index on `news_articles`

Migration 004 adds slug; verify unique index exists in production for `fetchArticleBySlug` performance.

### 7. Info — `tenant_memberships.user_id` not FK to `auth.users`

Intentional for flexibility; membership rows must be created after Auth signup (see `/api/dashboard/seed-membership`).

## Recommended actions

1. Run migration **021** on linked Supabase project before production traffic.
2. Regenerate types: `npm run supabase:types` (requires Supabase CLI login + link).
3. Verify anon cannot `select` from `tenant_memberships` in SQL Editor:

   ```sql
   set role anon;
   select * from tenant_memberships limit 1;
   ```

4. Rotate `SUPABASE_SERVICE_ROLE_KEY` if it was ever committed to git (check `.env.local` is gitignored).
5. Add Vercel env vars for all three Supabase keys on Production + Preview.

## Tables with RLS (OK)

- `news_articles`, `ingestion_logs`, `ingestion_failures`, `rss_source_health`
- `news_ai_queue`, `news_signals`, `news_events`, `generated_articles`, `editorial_image_queue`
- `api_provider_health`, `coverage_updates`
