# RC1-005 H2 — Environment & Feature Flag Hardening Report

**Project:** Phoenix / Jan Darpan Chhattisgarh  
**Task:** H2 — Environment & Feature Flag Hardening  
**Role:** Release Configuration Engineer  
**Date:** 2026-07-11  
**Source audit:** [RC1-005 Final Release Engineering Audit](./RC1-005-FINAL-RELEASE-AUDIT.md)

---

## Executive Summary

Environment documentation and feature-flag consistency gaps identified in RC1-005 have been remediated. `.env.example` now documents all 14 Phoenix V3 reader flags and 130+ additional variables referenced in code. Canonical operator documentation is published at [`docs/ENVIRONMENT.md`](./ENVIRONMENT.md). Startup validation now emits actionable messages for all six production-required variables, including `NEXT_PUBLIC_SITE_URL` (elevated from warn-only to required error).

**Production Readiness (H2 scope): PASS**

---

## Environment Audit Report

### Scope

| Source audited | Files |
|----------------|-------|
| Code usage | 230+ `process.env.*` references across `src/`, `scripts/`, Sentry configs |
| Template | `.env.example` |
| Vercel config | `vercel.json` (cron schedules only) |
| Runtime validation | `src/lib/security/env-validation.ts`, `src/instrumentation.ts`, `src/lib/infrastructure/production.ts` |
| Feature flag helpers | 14 reader V3 `config.ts` files + 8 server-side engine configs |

### Findings (pre-remediation)

| Category | Count | Severity |
|----------|------:|----------|
| V3 flags missing from `.env.example` | 4 | High (RC1-005 H3) |
| Other code-referenced vars missing from `.env.example` | 126 | Medium |
| Required prod var with generic validation message | 5 | Medium |
| `NEXT_PUBLIC_SITE_URL` required in `production.ts` but warn-only in `env-validation.ts` | 1 | Medium |
| Broken feature flags | 0 | — |
| Unused feature flags | 0 | — |
| Inconsistent flag patterns | 0 | Reader=`"1"`, Server=`"true"` (documented) |

### Vercel deployment verification

`vercel.json` does not define environment variables (expected — Vercel Dashboard only). Cron schedules reference 11 paths; all require `CRON_SECRET` at runtime.

| Variable | In `.env.example` | In startup validation | Vercel manual check |
|----------|-------------------|----------------------|---------------------|
| `NEXT_PUBLIC_SITE_URL` | ✓ | ✓ (now error) | Operator must verify |
| `NEXT_PUBLIC_SUPABASE_URL` | ✓ | ✓ | Operator must verify |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✓ | ✓ | Operator must verify |
| `SUPABASE_SERVICE_ROLE_KEY` | ✓ | ✓ | Operator must verify |
| `CRON_SECRET` | ✓ | ✓ | Operator must verify |
| `NEWSROOM_SUPER_ADMIN_EMAILS` | ✓ | ✓ | Operator must verify |
| All 14 V3 feature flags | ✓ (post-fix) | N/A (optional) | Operator must verify |

**Note:** Live Vercel Production env state was not queried in this session. Use Vercel Dashboard or `vercel env pull` to confirm values.

---

## Variables Added

### Critical (RC1-005 flagged)

Added to `.env.example` Phoenix feature flags section:

| Variable | Helper | Surface |
|----------|--------|---------|
| `NEXT_PUBLIC_PROFILE_V3` | `isProfileV3Enabled()` | `/archive` |
| `NEXT_PUBLIC_REELS_V3` | `isReelsV3Enabled()` | `/shorts` |
| `NEXT_PUBLIC_MONETIZATION_V3` | `isMonetizationV3Enabled()` | Ads + membership |
| `NEXT_PUBLIC_NOTIFICATION_CENTER_V3` | `isNotificationCenterV3Enabled()` | `/notifications` |

`NEXT_PUBLIC_ONBOARDING_V3` was already present (RC1-005 audit line reference was stale relative to template).

### Additional sections added to `.env.example`

- Admin dashboard public poll/debug flags
- Security keys (`SECURITY_2FA_ENCRYPTION_KEY`, scoped cron secrets)
- OpenRouter + OpenAI model overrides
- Newsroom pipeline extensions (translation, shorts, TTS, DAM)
- Translation pipeline tunables
- SEO engine tunables (GSC, SERP, competitor, autonomous, copilot)
- Queue/worker/image pipeline limits
- Redis/cache circuit-breaker tunables
- Development-only guard section (explicit "never set in Production")

**Total new documented variables:** 130+ (commented placeholders in `.env.example`)

---

## Variables Missing

### From Vercel (cannot verify locally)

These must be confirmed by the release operator in Vercel Dashboard:

- Production values for all six required variables
- `AI_LOCAL_ENRICH_ENABLED=false`
- QStash signing keys
- Optional Redis (`UPSTASH_REDIS_*`) for distributed rate limiting

### Intentionally not in `.env.example`

Platform-injected read-only vars (documented in `ENVIRONMENT.md` only):

- `VERCEL_*`, `NODE_ENV`, `NEXT_RUNTIME`, `NEXT_PHASE`
- `PLAYWRIGHT_*`, `CI` (test harness only)

### No code references found for

None — all production-critical paths have env documentation after this pass.

---

## Feature Flags

### Reader V3 (public) — 14 flags

| Flag | Default | Wired | `.env.example` | Pattern |
|------|---------|-------|----------------|---------|
| `NEXT_PUBLIC_HOME_V3` | OFF | ✓ | ✓ | `=== "1"` |
| `NEXT_PUBLIC_MORNING_BRIEF` | OFF | ✓ | ✓ | `=== "1"` |
| `NEXT_PUBLIC_AI_ASSISTANT_V3` | OFF | ✓ | ✓ | `=== "1"` |
| `NEXT_PUBLIC_ARTICLE_V3` | OFF | ✓ | ✓ | `=== "1"` |
| `NEXT_PUBLIC_SEARCH_V3` | OFF | ✓ | ✓ | `=== "1"` |
| `NEXT_PUBLIC_DISTRICT_V3` | OFF | ✓ | ✓ | `=== "1"` |
| `NEXT_PUBLIC_ONBOARDING_V3` | OFF | ✓ | ✓ | `=== "1"` |
| `NEXT_PUBLIC_LIVE_V3` | OFF | ✓ | ✓ | `=== "1"` |
| `NEXT_PUBLIC_ANALYTICS_V3` | OFF | ✓ | ✓ | `=== "1"` |
| `NEXT_PUBLIC_AUDIO_V3` | OFF | ✓ | ✓ | `=== "1"` |
| `NEXT_PUBLIC_PROFILE_V3` | OFF | ✓ | ✓ **added** | `=== "1"` |
| `NEXT_PUBLIC_REELS_V3` | OFF | ✓ | ✓ **added** | `=== "1"` |
| `NEXT_PUBLIC_MONETIZATION_V3` | OFF | ✓ | ✓ **added** | `=== "1"` |
| `NEXT_PUBLIC_NOTIFICATION_CENTER_V3` | OFF | ✓ | ✓ **added** | `=== "1"` |

### Server-side engine flags — 8 flags

| Flag | Default | Helper | Pattern |
|------|---------|--------|---------|
| `SEO_COMPETITOR_TRACKER` | OFF | `isCompetitorTrackerEnabled()` | `=== "true"` |
| `SEO_INTELLIGENCE_ENGINE` | OFF | `isSeoIntelligenceEnabled()` | `=== "true"` |
| `SEO_SERP_TRACKER` | OFF | `isSerpTrackerEnabled()` | `=== "true"` |
| `SEO_GSC_ENGINE` | OFF | `isGscEngineEnabled()` | `=== "true"` |
| `SEO_EXECUTION_ENGINE` | OFF | `isSeoExecutionEngineEnabled()` | `=== "true"` |
| `SEO_AUTONOMOUS_ENGINE` | OFF | `isAutonomousSeoEnabled()` | `=== "true"` |
| `AI_EDITORIAL_COPILOT` | OFF | `isAiCopilotEnabled()` | `=== "true"` |
| `SYSTEM_VALIDATION_ENGINE` | OFF | `isSystemValidationEnabled()` | `=== "true"` |

**Consistency verdict:** All flags have dedicated helpers, documented consumers, and matching `.env.example` entries. No broken or orphaned flags.

---

## Documentation Created

| Artifact | Path |
|----------|------|
| Environment reference | [`docs/ENVIRONMENT.md`](./ENVIRONMENT.md) |
| Updated template | [`.env.example`](../.env.example) |
| This report | [`docs/RC1-005-H2-ENVIRONMENT-AUDIT-REPORT.md`](./RC1-005-H2-ENVIRONMENT-AUDIT-REPORT.md) |

### Startup validation changes

[`src/lib/security/env-validation.ts`](../src/lib/security/env-validation.ts):

- Added `REQUIRED_PRODUCTION_ENV_MESSAGES` with actionable per-key messages
- Elevated `NEXT_PUBLIC_SITE_URL` to required error (aligned with `production.ts`)
- Removed duplicate warn-only `NEXT_PUBLIC_SITE_URL` check

---

## Production Readiness

| Gate | Result |
|------|--------|
| All `process.env` usages documented | **PASS** |
| `.env.example` complete for V3 flags | **PASS** |
| `docs/ENVIRONMENT.md` published | **PASS** |
| Required prod vars have clear validation messages | **PASS** |
| Feature flag helper consistency | **PASS** |
| Vercel env values verified live | **PENDING** (operator action) |
| **H2 overall** | **PASS** |

### Remaining operator actions (outside H2 scope)

1. Verify all six required vars in Vercel Production Dashboard
2. Confirm `AI_LOCAL_ENRICH_ENABLED=false` on Production
3. Confirm emergency/E2E dev flags are unset on Production
4. Enable V3 flags one-at-a-time on preview during RC1 soak

---

## Files changed

| File | Change |
|------|--------|
| `.env.example` | Added 130+ documented variables; 4 missing V3 flags |
| `docs/ENVIRONMENT.md` | **Created** — canonical env reference |
| `docs/RC1-005-H2-ENVIRONMENT-AUDIT-REPORT.md` | **Created** — this report |
| `src/lib/security/env-validation.ts` | Actionable required-var messages; `NEXT_PUBLIC_SITE_URL` elevated |

No business logic, UI, API, or architecture changes.

---

*H2 remediation complete. RC1-005 environment doc drift (risk H3) is resolved.*
