# Jandarpan End-to-End Verification

**Date:** July 2026  
**Scope:** Verification checklist for the admin command-centre overhaul (final implemented state)  
**Repo:** `jandarpan-ai-news-system` / `newspaper-motion`  
**App:** Next.js 16.2.6 · Supabase · Vercel  
**Domain:** https://www.jandarpan.news  

---

## 1. Verification posture

This document is a **structured E2E checklist** against the implemented code. Items marked **Code-verified** were confirmed by repository inspection in this session. Items marked **Operator-required** need a logged-in production/staging browser or live secrets and were **not** executed here.

---

## 2. Automated / unit checks (code-verified)

| Check | Evidence | Expected |
|-------|----------|----------|
| Super admin lands on command centre | `workspaces.test.ts` | `/admin/overview` |
| Editor lands on story queue | `workspaces.test.ts` | `/admin/stories` |
| Team workspace hidden from editors | `workspaces.test.ts` | `team` absent |
| SEO path → business workspace | `workspaces.test.ts` | `resolveWorkspaceFromPath('/admin/seo/rankings') === 'business'` |
| Safe `next` honouring / rejection | `workspaces.test.ts` | `/admin/team` ok; `https://evil.com` → overview |
| Legacy exact redirects exported | `legacy-redirects.ts` + `next.config.ts` | Permanent redirects registered |
| Admin robots noindex | `admin/layout.tsx` | `NOINDEX_ROBOTS` |
| Public robots disallow admin | `robots.ts` | `/admin/`, `/dashboard/` disallowed |
| Sitemap + news sitemap routes exist | `sitemap.ts`, `news-sitemap.xml/route.ts` | Present |
| Forgot/reset API routes exist | `api/dashboard/auth/forgot-password`, `reset-password` | Present |
| Vercel cron includes pipeline trio | `vercel.json` | fetch-news, orchestrate, edition-publish |

Suggested local command (operator):

```bash
npm test -- src/lib/admin-platform/workspaces.test.ts
```

---

## 3. Auth journey (operator-required)

| Step | Action | Pass criteria |
|------|--------|---------------|
| A1 | Open `/admin/login` | Brand + Command Centre subtitle; form usable on mobile width |
| A2 | Sign in as `super_admin` | Lands on `/admin/overview` |
| A3 | Sign in as `editor` | Lands on `/admin/stories` |
| A4 | Sign in as `moderator` / `journalist` | Lands on `/admin/editorial` |
| A5 | Sign in with `?next=/admin/team` as super_admin | Lands on team |
| A6 | Sign in with `?next=https://evil.com` | Falls back to role landing (not external) |
| A7 | Open `/admin/forgot-password`, submit email | Generic success UI; email arrives **if** Supabase mail configured |
| A8 | Follow reset link → `/admin/reset-password` | Hash session establishes; password update succeeds; can log in with new password |
| A9 | Logout | Returns to `/admin/login`; protected routes redirect |

---

## 4. Workspace IA journey (operator-required)

| Step | Action | Pass criteria |
|------|--------|---------------|
| W1 | As super_admin, open workspace switcher | Overview, Editorial, Business, Technical, Team, Settings available |
| W2 | Select Editorial | Sidebar shows editorial items only (≤14), not SEO/billing |
| W3 | Navigate to `/admin/seo/rankings` | Active workspace becomes Business |
| W4 | Navigate to `/admin/ingestion` | Active workspace becomes Technical |
| W5 | As editor, confirm Team absent | No Team workspace / `/admin/team` blocked |
| W6 | Open `/admin/overview` Command Centre | Attention cards + CTAs resolve without runtime crash |
| W7 | Open `/admin/editorial` | Editorial overview renders |

---

## 5. Legacy redirect journey (operator-required)

| Step | Request | Pass criteria |
|------|---------|---------------|
| R1 | `/dashboard` | Ends at `/admin/editorial` |
| R2 | `/dashboard/login` | Ends at `/admin/login` |
| R3 | `/dashboard/analytics` | Ends at `/admin/analytics` |
| R4 | `/dashboard/monitoring` | Ends at `/admin/ingestion` |
| R5 | `/dashboard/unknown-path` | Ends at `/admin/editorial` |
| R6 | `/admin/dashboard` | Ends at `/admin/overview` |

---

## 6. Pipeline smoke (operator-required)

| Step | Action | Pass criteria |
|------|--------|---------------|
| P1 | Technical → System health / workers | Status renders; no uncaught client error |
| P2 | Technical → Ingestion | Recent failures list loads (may be empty) |
| P3 | Overview attention with backlog | Links to stories / technical / ingestion work |
| P4 | Confirm Vercel cron history | fetch-news / orchestrate / edition-publish firing per `vercel.json` |

Live job success rates are **environment data** — not asserted here.

---

## 7. SEO smoke (operator-required + code-verified mix)

| Step | Action | Pass criteria |
|------|--------|---------------|
| S1 | `GET /robots.txt` | Disallows admin/dashboard/api; lists both sitemaps |
| S2 | `GET /sitemap.xml` | 200 XML/URL set (count depends on DB) |
| S3 | `GET /news-sitemap.xml` | 200 valid news sitemap (may be empty) |
| S4 | View source on `/admin/overview` | noindex directives present |
| S5 | Business → SEO screens | Panels load; GSC may show “configure credentials” if secrets missing |

**Do not** treat empty GSC panels as product bugs if credentials are absent — see `JANDARPAN_SEO_RESULTS_RECENT.md`.

---

## 8. Session summary

| Category | Status in this agent session |
|----------|------------------------------|
| Unit / static code verification | **Performed** |
| Browser E2E against production | **Not performed** |
| Password-reset email delivery | **Not performed** (external mail) |
| GSC impression/click verification | **Not performed** (no credentials) |

---

## 9. Related documents

- `JANDARPAN_ADMIN_REDESIGN.md`
- `JANDARPAN_AUTH_AUDIT.md`
- `JANDARPAN_PIPELINE_AUDIT.md`
- `JANDARPAN_SEO_AUDIT.md`
- `JANDARPAN_REMAINING_BLOCKERS.md`
