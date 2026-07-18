# Jandarpan Remaining Blockers (External Only)

**Date:** July 2026  
**Scope:** Blockers that remain **outside** the July 2026 admin command-centre overhaul implementation  
**Repo:** `jandarpan-ai-news-system` / `newspaper-motion`  
**Domain:** https://www.jandarpan.news  

---

## 1. Framing

This list intentionally excludes in-repo feature gaps for the overhaul itself (workspaces, command centre, simplified editorial nav, password recovery UI/APIs, and legacy redirects are **implemented**).  

Items below require **hosted configuration, third-party credentials, or live operational confirmation** that an agent session without production secrets cannot complete.

---

## 2. External blockers

### B1 — Live GSC / SEO results credentials

| Field | Detail |
|-------|--------|
| Impact | Cannot produce impression, click, CTR, or position trends; admin SEO panels may show configuration empty states |
| Why external | Google Search Console OAuth / service-account material lives in the deployment secret store, not in the repo |
| Expected config (from UI/docs in code) | Prefer `GSC_SERVICE_ACCOUNT_JSON`; or `GSC_REFRESH_TOKEN` + Google OAuth client credentials; engine flag `SEO_GSC_ENGINE=true` when required |
| Also required | Service account or OAuth user added on the Search Console property for `https://www.jandarpan.news` |
| Unblocks | Real results in `JANDARPAN_SEO_RESULTS_RECENT.md` follow-up; meaningful Business → SEO dashboards |

**Session status:** Credentials were **not available** in this agent session → verdict remains *insufficient data for impression/click trends*.

---

### B2 — Production password-reset email delivery (Supabase Auth)

| Field | Detail |
|-------|--------|
| Impact | Users can request a reset in-app, but may never receive the email if Auth mail is misconfigured |
| Why external | Delivery depends on Supabase project Auth settings (SMTP / built-in email, rate limits, template, redirect allowlist) |
| App already does | `resetPasswordForEmail` with `redirectTo = {site}/admin/reset-password`; generic anti-enumeration response |
| Operator checklist | Allow redirect URL `https://www.jandarpan.news/admin/reset-password`; confirm SMTP or Supabase email enabled; send a test reset; check spam |
| Unblocks | Fully operator-usable forgot/reset journey in production |

---

### B3 — Cron / QStash runtime secrets on Vercel

| Field | Detail |
|-------|--------|
| Impact | Pipeline ticks (`fetch-news`, `orchestrate`, `edition-publish`, SEO crons) fail auth or never fire if secrets/schedules diverge from code |
| Why external | `CRON_SECRET`, QStash signing keys, and Vercel project cron enablement are environment-level |
| Code readiness | `vercel.json` schedules + `REGISTERED_CRON_JOBS` + QStash setup script exist |
| Unblocks | Trustworthy Technical workspace health and edition cadence |

**Note:** This audit did not read production env values.

---

### B4 — News provider quotas / third-party rate limits

| Field | Detail |
|-------|--------|
| Impact | Ingestion gaps or 429 storms independent of admin IA quality |
| Why external | Provider plans and API keys (NewsData, GNews, etc.) |
| Unblocks | Stable fetch-news → AI queue supply |

---

### B5 — Analytics property access (if used for Business → Traffic)

| Field | Detail |
|-------|--------|
| Impact | Traffic & audience panels may lack live series without analytics credentials / wiring in the deployed env |
| Why external | GA4 (or equivalent) property access and env keys are not in this session |
| Unblocks | Non-placeholder audience reporting in Business workspace |

Where analytics is already wired in a given environment, this blocker may already be cleared — **status unknown here**.

---

## 3. Explicitly **not** blockers for the July overhaul

The following are **done in code** and should not be re-opened as “missing features” without a new product request:

- Workspace IA (`Overview`, `Editorial`, `Business`, `Technical`, `Team`, `Settings`)
- Command centre at `/admin/overview`
- Role landings for `super_admin` / `moderator` / `editor` / `journalist`
- Forgot/reset password **routes and APIs**
- Legacy `/dashboard` redirects via `legacy-redirects.ts` + `next.config.ts`
- Technical SEO files: `robots.ts`, `sitemap.ts`, `news-sitemap.xml` route, admin noindex

---

## 4. Recommended clearance order

1. Supabase Auth email + redirect allowlist (B2) — unblocks human access recovery.  
2. Vercel cron / QStash secrets (B3) — unblocks publishing cadence confidence.  
3. GSC credentials + property ACL (B1) — unblocks SEO results reporting.  
4. Provider quotas (B4) and analytics access (B5) as capacity allows.

---

## 5. Related documents

- `JANDARPAN_SEO_RESULTS_RECENT.md`
- `JANDARPAN_AUTH_AUDIT.md`
- `JANDARPAN_PIPELINE_AUDIT.md`
- `JANDARPAN_END_TO_END_VERIFICATION.md`
