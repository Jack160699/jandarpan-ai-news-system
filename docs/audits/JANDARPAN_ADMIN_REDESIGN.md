# Jandarpan Admin Redesign — Workspaces

**Date:** July 2026  
**Status:** Implemented (final state)  
**IA module:** `src/lib/admin-platform/workspaces.ts`  
**Shell:** `src/components/admin-newsroom/AdminShell.tsx`  
**Repo:** `jandarpan-ai-news-system` / `newspaper-motion`  
**Domain:** https://www.jandarpan.news  

---

## 1. Design intent

Replace a flat, cognitive-heavy sidebar with **six named workspaces**. Operators pick a workspace once; the sidebar then shows only that workspace’s destinations. Executives get an attention-first **command centre**; editorial staff stay in story flow; SEO/revenue and pipeline ops stop competing for the same primary list.

Brand in-shell: **Jandarpan · Command Centre**.

---

## 2. Workspace catalogue

### 2.1 Overview

| Field | Value |
|-------|-------|
| ID | `overview` |
| Permission | `analytics:read` |
| Home | `/admin/overview` |
| Description | Company health at a glance |

**Items**

- Command centre → `/admin/overview` (`CommandCentre`)
- Costs & AI spend → `/admin/executive` (hint: Details)

**Behaviour:** Super admins land here after login. The command centre summarizes publishing health, pending review, AI queue backlog, ingestion failures, and deep-links into Editorial / Business / Technical. Expandable detail panels cover publishing, attention, traffic, and costs without dumping every KPI on first paint.

---

### 2.2 Editorial

| Field | Value |
|-------|-------|
| ID | `editorial` |
| Permission | `content:read` |
| Home | `/admin/editorial` |
| Description | Stories, queues, and publishing |

**Items**

| Label | Href |
|-------|------|
| Editorial home | `/admin/editorial` |
| Story queue | `/admin/stories` |
| All stories | `/admin/articles` |
| Editor | `/admin/editor` |
| Workflow | `/admin/workflow` |
| Breaking & live | `/admin/live-wire` |
| Sources | `/admin/sources` |
| Districts | `/admin/districts` |
| Categories | `/admin/topics` |
| Images & media | `/admin/images` |
| Media library | `/admin/media` |
| Collaboration | `/admin/collaboration` |
| Coverage intel | `/admin/intelligence` |
| AI Copilot | `/admin/ai-copilot` |

**Simplification:** Editorial remains the largest workspace by design, but it is no longer mixed with SEO, billing, schema, and team screens in one scroll. Moderators and journalists land on `/admin/editorial`; editors land on `/admin/stories`.

---

### 2.3 Business

| Field | Value |
|-------|-------|
| ID | `business` |
| Permission | `analytics:read` |
| Home | `/admin/business` |
| Description | Audience, SEO, and revenue |

**Items**

| Label | Href |
|-------|------|
| Business overview | `/admin/business` |
| Traffic & audience | `/admin/analytics` |
| SEO | `/admin/seo/search-console` |
| Rankings | `/admin/seo/rankings` |
| Competitors | `/admin/seo/competitors` |
| SEO intelligence | `/admin/seo/intelligence` |
| SEO execution | `/admin/seo/execution` |
| Autonomous SEO | `/admin/seo/autonomous` |
| Revenue & billing | `/admin/billing` |

Path resolver treats `/admin/seo/*`, `/admin/analytics`, and `/admin/billing` as Business.

---

### 2.4 Technical

| Field | Value |
|-------|-------|
| ID | `technical` |
| Permission | `monitoring:read` |
| Home | `/admin/technical` |
| Description | Pipeline, workers, and system health |

**Items**

| Label | Href |
|-------|------|
| System health | `/admin/technical` |
| Health details | `/admin/health` |
| Pipeline & workers | `/admin/system` |
| Ingestion | `/admin/ingestion` |
| Database & schema | `/admin/schema` |

Journalists with `monitoring:read` can access Technical (see unit test). Schema remains **super_admin**-gated at the item/route policy layer.

---

### 2.5 Team

| Field | Value |
|-------|-------|
| ID | `team` |
| Permission | `super_admin` |
| Home | `/admin/team` |
| Description | People and access |

**Items:** Team & access → `/admin/team` only.  
Editors and lower roles never see this workspace.

---

### 2.6 Settings

| Field | Value |
|-------|-------|
| ID | `settings` |
| Permission | `editorial:write` |
| Home | `/admin/settings` |
| Description | Platform configuration |

**Items**

- General → `/admin/settings`
- Organization → `/admin/settings/organization`

---

## 3. Shell UX patterns (implemented)

- Workspace switcher in `AdminShell` (collapsed sidebar supported).
- Active workspace derived from pathname via `resolveWorkspaceFromPath`.
- Visible items filtered by `canAccessAdminRoute` + privileged href rules (`team`, `schema`, `billing`).
- Theme toggle, search slot, toast, live indicator retained from the newsroom shell language.
- Sign-out → `POST /api/dashboard/auth/logout` → `/admin/login`.

---

## 4. Role landings

| Role | Landing |
|------|---------|
| `super_admin` | `/admin/overview` |
| `moderator` | `/admin/editorial` |
| `editor` | `/admin/stories` |
| `journalist` | `/admin/editorial` |

Implemented in `landingPathForRole` / `resolveAdminLanding`.

---

## 5. Auth entry redesign (paired with IA)

- Login brand block: **Jandarpan.news / Admin Command Centre**
- Compact card UI with remember-email, show/hide password, forgot-password link
- Recovery routes: `/admin/forgot-password`, `/admin/reset-password`

Details: `JANDARPAN_AUTH_AUDIT.md`.

---

## 6. Out of scope for this redesign doc

- Changing canonical RBAC role names (unchanged: `super_admin`, `moderator`, `editor`, `journalist`)
- Replacing `/api/dashboard/auth/*` path prefixes (kept for cookie/client compatibility)
- Inventing SEO performance outcomes

---

## 7. Related documents

- `JANDARPAN_ADMIN_INVENTORY.md`
- `JANDARPAN_EXECUTIVE_AUDIT.md`
- `docs/ADMIN_PLATFORM_UNIFICATION.md`
