# Jandarpan Executive Audit

**Date:** July 2026  
**Scope:** Final implemented state after the admin command-centre overhaul  
**Product:** Jandarpan / Jan Darpan Chhattisgarh  
**Repo:** `jandarpan-ai-news-system` / `newspaper-motion`  
**Stack:** Next.js 16.2.6, React 19, Supabase, Vercel, Upstash QStash  
**Canonical domain:** https://www.jandarpan.news  
**Language posture:** Hindi primary, English secondary  

---

## 1. Executive verdict

The July 2026 overhaul converted a flat, overcrowded admin sidebar into a **workspace-based command centre**. Operators now land on role-appropriate homes; executives get a single attention-first overview; editorial staff get a shorter primary nav scoped to story work; password recovery is first-class; legacy `/dashboard` bookmarks continue via permanent redirects.

**Overall readiness for day-to-day newsroom operations: implemented and wired.**  
**Live SEO / GSC performance proof in this audit session: not available** (credentials and live Search Console data were not accessible to the agent — see `JANDARPAN_SEO_RESULTS_RECENT.md`).

---

## 2. What changed (July 2026)

| Area | Final state |
|------|-------------|
| Information architecture | Six workspaces defined in `src/lib/admin-platform/workspaces.ts`: Overview, Editorial, Business, Technical, Team, Settings |
| Command centre | `/admin/overview` — `CommandCentre` attention model (publishing health, backlog, quick links) |
| Editorial simplification | Primary nav shows only the active workspace’s items; editorial home at `/admin/editorial` |
| Auth / recovery | Redesigned `/admin/login`; `/admin/forgot-password` + `/admin/reset-password`; APIs under `/api/dashboard/auth/` |
| Legacy paths | Exact `/dashboard/*` map + catch-all in `legacy-redirects.ts`; wired in `next.config.ts` (308 permanent) and middleware |
| Roles | Canonical: `super_admin`, `moderator`, `editor`, `journalist` — each maps to a landing path |

---

## 3. Business outcomes supported

1. **Faster executive scan** — Super admins land on `/admin/overview` and see “what needs attention today” without hunting a 29-item list.
2. **Clearer ownership** — Business (SEO/traffic/billing) and Technical (pipeline/health) are separated workspaces, reducing accidental navigation into ops screens during editorial reviews.
3. **Lower lockout risk** — Password reset flow exists end-to-end in app code; delivery still depends on Supabase Auth email configuration in the project (external).
4. **Bookmark continuity** — Old `/dashboard` URLs redirect to `/admin` successors so shared links and muscle memory do not break.

---

## 4. Role → landing map (implemented)

| Canonical role | Landing after login |
|----------------|---------------------|
| `super_admin` | `/admin/overview` (command centre) |
| `moderator` | `/admin/editorial` |
| `editor` | `/admin/stories` |
| `journalist` (default) | `/admin/editorial` |

Safe `?next=` targets under `/admin` (excluding login) are honoured via `resolveAdminLanding` in `src/lib/admin-platform/role-landing.ts`.

---

## 5. Platform facts (non-invented)

| Fact | Value / source |
|------|----------------|
| Package name | `jan-darpan-chhattisgarh` (`package.json`) |
| Next.js | `16.2.6` |
| Site URL constant | `https://www.jandarpan.news` (`CANONICAL_SITE_URL`) |
| Brand (EN / HI) | Jan Darpan Chhattisgarh / जन दर्पण छत्तीसगढ़ |
| Admin robots | `NOINDEX_ROBOTS` on `src/app/admin/layout.tsx` |
| Public robots | Disallows `/admin/`, `/dashboard/`, `/api/`, `/debug/` |

---

## 6. Residual executive risks

These are **external or configuration** risks, not missing UI features:

- Live GSC impression/click trends cannot be asserted without production OAuth / service-account credentials in-session.
- Password-reset emails require Supabase Auth SMTP / email templates and redirect URL allowlisting for `https://www.jandarpan.news/admin/reset-password`.
- Pipeline health depends on Vercel cron + QStash signing keys being present in the deployed environment (code paths exist; runtime secrets were not verified live in this session).

See `JANDARPAN_REMAINING_BLOCKERS.md` for the external-only blocker list.

---

## 7. Related audits

| Document | Focus |
|----------|--------|
| `JANDARPAN_ADMIN_REDESIGN.md` | Workspace IA detail |
| `JANDARPAN_ADMIN_INVENTORY.md` | Old flat nav → workspaces |
| `JANDARPAN_AUTH_AUDIT.md` | Login + password recovery |
| `JANDARPAN_PIPELINE_AUDIT.md` | Editorial / cron pipeline |
| `JANDARPAN_SEO_AUDIT.md` | Technical SEO surfaces |
| `JANDARPAN_END_TO_END_VERIFICATION.md` | Verification checklist |
