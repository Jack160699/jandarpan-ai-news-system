# Jandarpan Admin Inventory — Flat Nav → Workspaces

**Date:** July 2026  
**Scope:** Map the pre-overhaul flat ~29-item admin sidebar to the July 2026 workspace IA  
**Source of truth (new):** `src/lib/admin-platform/workspaces.ts`  
**Repo:** `jandarpan-ai-news-system` / `newspaper-motion`  

---

## 1. Summary

Before the command-centre overhaul, operators saw a **single long sidebar** of roughly **29 destinations**. After the overhaul, those destinations are grouped into **six workspaces**. The primary nav shows only the **active workspace’s items**, plus a workspace switcher — dramatically shortening day-to-day chrome.

New workspace **homes** (`/admin/overview`, `/admin/business`, `/admin/technical`, plus clearer `/admin/editorial`) were added as landings; they did not all exist as first-class flat items before.

---

## 2. Old flat inventory (29 items) → new workspace

| # | Former flat destination | Label (approx.) | New workspace | New href (unchanged unless noted) |
|---|-------------------------|-----------------|---------------|-----------------------------------|
| 1 | `/admin/editorial` | Editorial overview | **Editorial** | `/admin/editorial` |
| 2 | `/admin/intelligence` | Coverage / intelligence | **Editorial** | `/admin/intelligence` |
| 3 | `/admin/editor` | Editor | **Editorial** | `/admin/editor` |
| 4 | `/admin/workflow` | Workflow | **Editorial** | `/admin/workflow` |
| 5 | `/admin/collaboration` | Collaboration | **Editorial** | `/admin/collaboration` |
| 6 | `/admin/stories` | Story queue / desk | **Editorial** | `/admin/stories` |
| 7 | `/admin/articles` | All stories / articles | **Editorial** | `/admin/articles` |
| 8 | `/admin/districts` | Districts | **Editorial** | `/admin/districts` |
| 9 | `/admin/topics` | Categories / topics | **Editorial** | `/admin/topics` |
| 10 | `/admin/sources` | Sources | **Editorial** | `/admin/sources` |
| 11 | `/admin/live-wire` | Breaking & live | **Editorial** | `/admin/live-wire` |
| 12 | `/admin/images` | Images & media tools | **Editorial** | `/admin/images` |
| 13 | `/admin/media` | Media library | **Editorial** | `/admin/media` |
| 14 | `/admin/ai-copilot` | AI Copilot | **Editorial** | `/admin/ai-copilot` |
| 15 | `/admin/analytics` | Traffic & audience | **Business** | `/admin/analytics` |
| 16 | `/admin/seo/search-console` | SEO / GSC | **Business** | `/admin/seo/search-console` |
| 17 | `/admin/seo/rankings` | Rankings | **Business** | `/admin/seo/rankings` |
| 18 | `/admin/seo/competitors` | Competitors | **Business** | `/admin/seo/competitors` |
| 19 | `/admin/seo/intelligence` | SEO intelligence | **Business** | `/admin/seo/intelligence` |
| 20 | `/admin/seo/execution` | SEO execution | **Business** | `/admin/seo/execution` |
| 21 | `/admin/seo/autonomous` | Autonomous SEO | **Business** | `/admin/seo/autonomous` |
| 22 | `/admin/billing` | Revenue & billing | **Business** | `/admin/billing` |
| 23 | `/admin/ingestion` | Ingestion | **Technical** | `/admin/ingestion` |
| 24 | `/admin/health` | Health details | **Technical** | `/admin/health` |
| 25 | `/admin/system` | Pipeline & workers | **Technical** | `/admin/system` |
| 26 | `/admin/schema` | Database & schema | **Technical** | `/admin/schema` |
| 27 | `/admin/executive` | Costs & AI spend | **Overview** | `/admin/executive` |
| 28 | `/admin/team` | Team & access | **Team** | `/admin/team` |
| 29 | `/admin/settings` (+ org) | Settings | **Settings** | `/admin/settings`, `/admin/settings/organization` |

**Count note:** Item 29 covers General + Organization as the settings cluster that previously competed for flat sidebar space. AI Copilot / SEO leaves may have appeared as deep links rather than always-visible items depending on role; the table reflects the **union** of flat destinations that the overhaul folded into workspaces.

---

## 3. New landings (not part of the old 29)

| Href | Workspace | Purpose |
|------|-----------|---------|
| `/admin/overview` | Overview | Command centre (executive attention UI) |
| `/admin/business` | Business | Business overview hub |
| `/admin/technical` | Technical | System health hub |

---

## 4. Legacy `/dashboard` inventory (still redirected)

These are **not** sidebar items in the new IA; they remain as permanent redirects for bookmarks:

| Legacy | Destination |
|--------|-------------|
| `/dashboard` | `/admin/editorial` |
| `/dashboard/login` | `/admin/login` |
| `/dashboard/content` | `/admin/stories` |
| `/dashboard/publish` | `/admin/stories` |
| `/dashboard/editorial` | `/admin/editorial` |
| `/dashboard/providers` | `/admin/sources` |
| `/dashboard/analytics` | `/admin/analytics` |
| `/dashboard/monitoring` | `/admin/ingestion` |
| `/dashboard/team` | `/admin/team` |
| `/dashboard/billing` | `/admin/billing` |
| `/dashboard/*` (other) | `/admin/editorial` |

Also: `/admin/dashboard` → `/admin/overview` (non-permanent redirect in `next.config.ts`).

---

## 5. Nav item totals in the new model

From `ADMIN_WORKSPACES` item arrays:

| Workspace | Item count |
|-----------|------------|
| Overview | 2 |
| Editorial | 14 |
| Business | 9 |
| Technical | 5 |
| Team | 1 |
| Settings | 2 |
| **Total registered nav hrefs** | **33** |

Primary chrome is shorter because only **one workspace’s items** render at a time (plus the workspace switcher), not all 33 simultaneously.

Helpers:

- `allWorkspaceNavHrefs()` / `listAdminNavHrefs()` for inventory & tests  
- Privileged hrefs (`/admin/team`, `/admin/schema`, `/admin/billing`) stay hidden until role is resolved  

---

## 6. Role visibility (high level)

| Workspace | Gate |
|-----------|------|
| Overview | `analytics:read` |
| Editorial | `content:read` |
| Business | `analytics:read` |
| Technical | `monitoring:read` |
| Team | `super_admin` only |
| Settings | `editorial:write` |

Per-route RBAC remains in `src/lib/newsroom-auth/rbac.ts` (finer than workspace gates). Editors do **not** see Team (`workspaces.test.ts`).

---

## 7. Related documents

- `JANDARPAN_ADMIN_REDESIGN.md` — workspace narratives  
- `docs/ADMIN_PLATFORM_UNIFICATION.md` — earlier `/dashboard` → `/admin` unification  
- `JANDARPAN_END_TO_END_VERIFICATION.md`  
