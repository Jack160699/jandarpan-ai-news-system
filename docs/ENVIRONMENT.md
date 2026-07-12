# Environment Variables Reference

**Project:** Jan Darpan / Newspaper Motion  
**Stack:** Next.js 16 · Vercel · Supabase  
**Template:** [`.env.example`](../.env.example)  
**Validation:** [`src/lib/security/env-validation.ts`](../src/lib/security/env-validation.ts) · [`src/instrumentation.ts`](../src/instrumentation.ts)

This document is the canonical reference for environment configuration. Copy `.env.example` to `.env.local` for local development. Set production values in the **Vercel Dashboard** (Project → Settings → Environment Variables). `vercel.json` defines cron schedules only — it does not inject env vars.

---

## Required variables (production)

These variables **must** be set on Vercel Production. Startup validation (`assertProductionEnvSafe`) throws if any are missing when `NODE_ENV=production` or `VERCEL_ENV=production`.

| Variable | Scope | Purpose | Validation message |
|----------|-------|---------|-------------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Supabase project URL | Missing — set from Supabase Dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | Supabase anon/publishable key | Missing — use publishable key from API Keys |
| `SUPABASE_SERVICE_ROLE_KEY` | Server | Admin DB access, cron workers | Missing — server-only; never expose to browser |
| `CRON_SECRET` | Server | Vercel cron + QStash auth | Missing — `openssl rand -hex 32` |
| `NEWSROOM_SUPER_ADMIN_EMAILS` | Server | RBAC super-admin bootstrap | Missing — comma-separated admin emails |
| `NEXT_PUBLIC_SITE_URL` | Public | Canonical SEO/OG/sitemap URLs | Missing — canonical domain for SEO and invite links |

**Also required for full production operation** (validated at startup as warnings/degraded, not hard errors):

| Variable | Notes |
|----------|-------|
| `OPENAI_API_KEY` | AI pipeline, editorial, translations |
| `GNEWS_API_KEY` or `NEWSDATA_API_KEY` | At least one wire provider for ingest |
| `QSTASH_CURRENT_SIGNING_KEY` + `QSTASH_NEXT_SIGNING_KEY` | QStash-signed cron deliveries |
| `AI_LOCAL_ENRICH_ENABLED=false` | Must be `false` in production (warn if not) |

---

## Optional variables

### Newsroom pipeline

| Variable | Default | Description |
|----------|---------|-------------|
| `NEWSROOM_CLUSTER_EVENTS` | `true` in template | Enable AI event clustering |
| `NEWSROOM_GENERATE_ARTICLES` | `true` | Generate editorial articles from clusters |
| `NEWSROOM_AUTO_PUBLISH` | `true` | Auto-publish generated articles |
| `NEWSROOM_LEGACY_BRIDGE` | `true` | Bridge legacy + generated content |
| `NEWSROOM_AUTO_TRANSLATE` | off | Multilingual translation queue |
| `NEWSROOM_TRANSLATE_LANGS` | — | Comma-separated target languages |
| `NEWSROOM_EDITORIAL_IMAGES` | off | DALL·E editorial image generation |
| `NEWSROOM_USE_EMBEDDINGS` | off | Embedding-based clustering |
| `NEWSROOM_DEFAULT_TENANT` | — | Default tenant slug |
| `NEWSROOM_STORAGE_BUCKET` | `editorial-images` | Supabase storage bucket for images |

### Performance & queue tuning

See `.env.example` sections for full list. Key tunables:

- `INGEST_BUDGET_MS`, `ORCHESTRATE_BUDGET_MS` — serverless time budgets
- `AI_QUEUE_*`, `IMAGE_QUEUE_*`, `WORKER_*` — queue batch sizes and retry policy
- `HOMEPAGE_CACHE_SECONDS`, `API_EDGE_CACHE_SECONDS` — ISR/edge cache TTLs
- `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` — distributed cache and rate limits

### Observability

| Variable | Description |
|----------|-------------|
| `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` | Error tracking |
| `SENTRY_TRACES_SAMPLE_RATE` | Server trace sampling (default 0.1) |
| `SENTRY_ENABLED` | Force-enable Sentry outside production |
| `LOG_LEVEL` | Log verbosity |
| `PIPELINE_VERBOSE_LOGS=1` | Verbose pipeline logging |

### SEO intelligence engines (server-side flags)

All default **OFF**. Set to `true` to enable.

| Flag | Helper | Cron route |
|------|--------|------------|
| `SEO_COMPETITOR_TRACKER` | `isCompetitorTrackerEnabled()` | `/api/cron/competitor-tracker` |
| `SEO_INTELLIGENCE_ENGINE` | `isSeoIntelligenceEnabled()` | `/api/cron/seo-intelligence` |
| `SEO_SERP_TRACKER` | `isSerpTrackerEnabled()` | `/api/cron/serp-tracker` |
| `SEO_GSC_ENGINE` | `isGscEngineEnabled()` | `/api/cron/gsc-intelligence` |
| `SEO_EXECUTION_ENGINE` | `isSeoExecutionEngineEnabled()` | — |
| `SEO_AUTONOMOUS_ENGINE` | `isAutonomousSeoEnabled()` | `/api/cron/seo-autonomous` |
| `AI_EDITORIAL_COPILOT` | `isAiCopilotEnabled()` | — |
| `SYSTEM_VALIDATION_ENGINE` | `isSystemValidationEnabled()` | — |

Supporting credentials: `GSC_SERVICE_ACCOUNT_JSON`, `GSC_REFRESH_TOKEN`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `SERPAPI_KEY`, `GOOGLE_CSE_API_KEY`, `GOOGLE_CSE_CX`.

### Admin dashboard polling

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_ADMIN_POLL_MS` | `60000` | Default admin dashboard poll interval |
| `NEXT_PUBLIC_ADMIN_ANALYTICS_POLL_MS` | `120000` | Analytics panel poll interval |
| `NEXT_PUBLIC_ADMIN_LIVE_POLL` | off | Enable live polling mode (`1`) |

### Scoped cron secrets (optional hardening)

| Variable | Purpose |
|----------|---------|
| `CRON_INGEST_SECRET` | Scoped secret for ingest cron |
| `CRON_PIPELINE_SECRET` | Scoped secret for pipeline cron |
| `CRON_API_SECRET` | Legacy cron API secret |
| `ADMIN_SECRET` | Admin API fallback auth |
| `INTERNAL_API_KEY` | Internal service-to-service auth |

---

## Development only

**Never set these on Vercel Production.** Startup validation errors if detected in production.

| Variable | Purpose |
|----------|---------|
| `DASHBOARD_DEV_BYPASS=1` | Skip auth for local dashboard dev |
| `DASHBOARD_DEV_EMAIL` | Email used with dev bypass |
| `ENABLE_E2E_AUTH=1` | Playwright E2E auth shortcuts |
| `ADMIN_EMERGENCY_MODE=1` | Disable team APIs (local emergency) |
| `NEXT_PUBLIC_ADMIN_EMERGENCY_MODE=1` | Client-side emergency banner |
| `ADMIN_DEBUG=1` | Verbose admin traces |
| `NEXT_PUBLIC_ADMIN_DEBUG=1` | Client-side admin debug traces |
| `AUTH_TRACE=1` | Auth flow tracing |
| `INGEST_TRACE=1` | Ingest pipeline tracing |
| `QSTASH_TOKEN` | Local QStash setup CLI only |

---

## Production only

| Variable | Value | Purpose |
|----------|-------|---------|
| `AI_LOCAL_ENRICH_ENABLED` | `false` | Disable mock AI enrichment |
| `SECURITY_ENV_STRICT` | `1` | Fail fast on any env error (also default in prod) |
| `SECURITY_2FA_ENCRYPTION_KEY` | dedicated secret | 2FA key storage (warn if missing) |
| `SECURITY_REQUIRE_2FA` | — | Enforce 2FA for admin users |

Vercel-injected (read-only, do not set manually):

- `VERCEL_ENV`, `VERCEL_URL`, `VERCEL_GIT_COMMIT_SHA`, `VERCEL_GIT_COMMIT_REF`, `VERCEL_DEPLOYMENT_ID`
- `NODE_ENV`, `NEXT_RUNTIME`, `NEXT_PHASE`

---

## Security-sensitive variables

These **must never** use the `NEXT_PUBLIC_` prefix. Startup checks scan for leaked public prefixes.

| Variable | Risk if exposed |
|----------|-----------------|
| `SUPABASE_SERVICE_ROLE_KEY` | Full database bypass of RLS |
| `CRON_SECRET` / scoped cron secrets | Unauthorized cron execution |
| `OPENAI_API_KEY` | API cost abuse |
| `OPENROUTER_API_KEY` | API cost abuse |
| `GNEWS_API_KEY`, `NEWSDATA_API_KEY`, `SERPAPI_KEY` | Provider quota abuse |
| `GSC_SERVICE_ACCOUNT_JSON` | Google Search Console access |
| `QSTASH_CURRENT_SIGNING_KEY`, `QSTASH_NEXT_SIGNING_KEY` | Forged cron deliveries |
| `SECURITY_2FA_ENCRYPTION_KEY` | 2FA secret decryption |
| `ADMIN_SECRET`, `INTERNAL_API_KEY`, `AUTH_SECRET`, `API_SECRET` | Privileged API access |

`NEXT_PUBLIC_SUPABASE_ANON_KEY` is safe for the browser (designed for client use with RLS). Validation rejects values that look like service/secret keys.

---

## Feature flags

### Reader V3 flags (public, default OFF)

All Phoenix reader flags use the pattern `NEXT_PUBLIC_*_V3=1` (string `"1"` enables). Helpers live in each feature's `config.ts`.

| Flag | Helper | Primary route / surface |
|------|--------|-------------------------|
| `NEXT_PUBLIC_HOME_V3` | `isHomeV3Enabled()` | Homepage live view |
| `NEXT_PUBLIC_MORNING_BRIEF` | `isMorningBriefEnabled()` | Morning brief page |
| `NEXT_PUBLIC_AI_ASSISTANT_V3` | `isAiAssistantV3Enabled()` | `/ai-assistant` |
| `NEXT_PUBLIC_ARTICLE_V3` | `isArticleV3Enabled()` | `/story/[slug]` |
| `NEXT_PUBLIC_SEARCH_V3` | `isSearchV3Enabled()` | `/search`, search overlay |
| `NEXT_PUBLIC_DISTRICT_V3` | `isDistrictV3Enabled()` | `/district/[slug]` |
| `NEXT_PUBLIC_ONBOARDING_V3` | `isOnboardingV3Enabled()` | AppChrome onboarding |
| `NEXT_PUBLIC_LIVE_V3` | `isLiveV3Enabled()` | `/live` |
| `NEXT_PUBLIC_ANALYTICS_V3` | `isAnalyticsV3Enabled()` | `/admin/analytics` |
| `NEXT_PUBLIC_AUDIO_V3` | `isAudioV3Enabled()` | `/listen` |
| `NEXT_PUBLIC_PROFILE_V3` | `isProfileV3Enabled()` | `/archive` (profile) |
| `NEXT_PUBLIC_REELS_V3` | `isReelsV3Enabled()` | `/shorts` |
| `NEXT_PUBLIC_MONETIZATION_V3` | `isMonetizationV3Enabled()` | Ads + membership UI |
| `NEXT_PUBLIC_NOTIFICATION_CENTER_V3` | `isNotificationCenterV3Enabled()` | `/notifications` |

**RC1 rollout recommendation:** Deploy with all V3 flags unset (OFF). Enable one flag at a time on preview before production.

### Server-side feature flags

Server flags use `=== "true"` (not `"1"`). See [Optional variables → SEO intelligence engines](#seo-intelligence-engines-server-side-flags).

---

## Vercel deployment checklist

Confirm these in Vercel Dashboard → Settings → Environment Variables → **Production**:

- [ ] `NEXT_PUBLIC_SITE_URL` — canonical domain (e.g. `https://www.jandarpan.news`)
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `CRON_SECRET`
- [ ] `NEWSROOM_SUPER_ADMIN_EMAILS`
- [ ] `OPENAI_API_KEY`
- [ ] `GNEWS_API_KEY` or `NEWSDATA_API_KEY`
- [ ] `QSTASH_CURRENT_SIGNING_KEY` + `QSTASH_NEXT_SIGNING_KEY`
- [ ] `AI_LOCAL_ENRICH_ENABLED=false`
- [ ] All V3 feature flags explicitly set or left unset (OFF)
- [ ] `ADMIN_EMERGENCY_MODE` and `ENABLE_E2E_AUTH` are **not** set

`vercel.json` cron paths require `CRON_SECRET` on each scheduled invocation. No env vars are defined in `vercel.json` itself.

---

## Startup validation flow

1. **`instrumentation.ts`** (Node.js runtime only):
   - Initializes Sentry
   - Calls `assertProductionEnvSafe()` — throws on missing required vars in production
   - Runs `getProductionEnvChecks()` — logs degraded ops events for warnings
   - Runs `runStartupInfraChecks()` — OpenAI, Redis, QStash, GSC, news providers

2. **`getPublicSupabaseEnv()`** — throws with specific messages when Supabase public env is invalid at runtime.

3. **Health endpoint** — `/api/health` exposes `nodeEnv`, `vercelEnv`, and production readiness checks (no secrets).

---

## Related docs

- [RC1-005 Final Release Audit](./RC1-005-FINAL-RELEASE-AUDIT.md) — production readiness scorecard
- [RC1-005 H2 Environment Audit](./RC1-005-H2-ENVIRONMENT-AUDIT-REPORT.md) — this hardening pass
- [Production Operations](./PRODUCTION_OPERATIONS.md)
- [QStash Scheduler Setup](./QSTASH_SCHEDULER_SETUP.md)
