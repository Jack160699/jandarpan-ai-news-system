# Jan Darpan — Public Reader Redesign · Final Report

**Phase:** 1 of 7 (Foundation) · **Status:** delivered to preview, awaiting sign-off
**Date:** 2026-07-19

> Scope for this session was agreed as: feature-flagged rollout, stop at pushed
> branch + Vercel preview (no autonomous merge-to-main or production deploy),
> foundation first (audit + tokens + core components + faithful homepage,
> verified with build + screenshots). This report reflects exactly that.

---

## Git

| Item | Value |
|------|-------|
| Rollback branch | `rollback/reader-design-20260719` → `33d1cb1` (stable `main` at start) |
| Feature branch | `feat/jandarpan-reader-design-system` |
| Phase 1 commit | `1275475` — *feat(reader): add navy/red/gold reader design system foundation (flag-gated)* |
| Pushed to | `origin/feat/jandarpan-reader-design-system` (GitHub: Jack160699/newspaper-motion → jandarpan-ai-news-system) |
| Merge commit | — (not merged; gated on sign-off) |
| Production commit | — (not deployed; gated on sign-off) |

⚠️ During the session an external process performed a `git checkout main` that
reverted uncommitted working-tree edits to 3 tracked files. This was detected
via reflog and fully recovered; all changes are captured in commit `1275475` on
the feature branch. No work was lost and `main` was never modified.

---

## Rollout model

Fully **feature-flagged**: `NEXT_PUBLIC_READER_DS=1`.
- Flag OFF (default / current production): the existing reader UI is 100% unchanged.
- Flag ON: the homepage (`/`) renders the new navy/red/gold design and opts out of the legacy app chrome (it ships its own masthead + bottom nav).

---

## Implemented (Phase 1)

**Routes:** `/` (homepage) — flag-gated `ReaderHomepage`.

**Screens (design group A):** Homepage (screen #1) faithfully implemented from the live feed. Remaining 53 screens are mapped and scheduled (see audit doc §4).

**Design token layer** (`src/features/reader-ds/styles/tokens.css`, scoped to `.jd-ds`):
navy `#0a2550`, deep-red `#9e1b22`, gold `#c19a3e`, cream `#f7f4ec`, ink `#16130d`,
success `#2f7d52`, amber, full dark-mode set; spacing 2·4·8·12·14·18·24·32; radius 2px;
touch ≥44px; image ratios 3:2/16:9/1:1/4:5; fonts Mukta + Tiro Devanagari Hindi + Noto Serif Devanagari.

**Component inventory** (`src/features/reader-ds/components/`):
`icons` (22 line icons, no emoji), `ArticleImage` (CDN-optimized + missing/broken fallback + data-saver), `Tag`, `SectionHeader`, `AiSummary` (AI-transparency label), `ActionRow` (listen/share/save), `Masthead`, `UtilityRow`, `BreakingStrip`, `LeadStory`, `SecondaryStory`, `Ad` (label + report/close), `BottomNav` (5-item), `AudioBriefingCta`. Plus `config`, `fonts`, `utils` (Hindi relative time, story href), and `homepage/ReaderHomepage` (assembles the live `GeneratedHomepageFeed`).

**Backend systems preserved:** Next.js App Router, TypeScript, Supabase, auth/RBAC,
i18n, district/category/article routes, publishing & ingestion, SEO (metadata,
canonical, JSON-LD, sitemaps), audio, ads, membership, analytics, admin/editorial,
Vercel config, ISR/caching, Sentry. No admin changes, no migrations, no data changes, no secrets touched.

---

## Verification results

| Check | Command | Result |
|-------|---------|--------|
| Typecheck | `npm run typecheck` | ✅ 0 errors |
| Lint | `npx eslint src/features/reader-ds src/app/page.tsx src/components/navigation/AppChrome.tsx` | ✅ 0 errors |
| Build (flag OFF) | `npm run build` | ✅ success — production behaviour intact |
| Build (flag ON) | `NEXT_PUBLIC_READER_DS=1 npm run build` | ✅ success |
| Dev render (flag ON) | `NEXT_PUBLIC_READER_DS=1 npm run dev` | ✅ homepage renders live feed |

**Screenshots:** `docs/jandarpan-reader-redesign/screenshots/mobile-homepage-masthead.png`, `.../homepage-full-width.png` (navy masthead + gold rule, red utility pin, weather, breaking strip, 5-item bottom nav — faithful to design).

---

## Preview deployment

| Item | Value |
|------|-------|
| Deployment ID | `dpl_4k1wukGYe9mmmXBreMhtK1hr3zUr` (commit `2f867ff`) — **state: READY ✅** |
| Prior deploy | `dpl_6VGr8aT7yntvxT2uW1rk1QWy9eAF` (commit `1275475`) — READY |
| Trigger | auto (GitHub push of `feat/jandarpan-reader-design-system`) |
| Preview URL | https://newspaper-motion-mk0v5rbp9-jack160699s-projects.vercel.app |
| Branch alias | https://newspaper-motion-git-feat-jandarpan-b9dd37-jack160699s-projects.vercel.app |
| Inspector | https://vercel.com/jack160699s-projects/newspaper-motion/4k1wukGYe9mmmXBreMhtK1hr3zUr |

**Smoke test:** the Vercel preview builds succeeded (READY) → build integrity on
Vercel infra confirmed. The preview currently renders the *existing* reader UI
because the flag is OFF in the Preview environment (see action required below).

**⚠️ Action required to see the new design on preview:** set `NEXT_PUBLIC_READER_DS=1`
as a **Preview-scoped** (or this-branch-scoped) environment variable on the Vercel
project, then redeploy the branch. Without it, the preview renders the existing
reader UI (the flag defaults OFF). Recommended: scope it to the
`feat/jandarpan-reader-design-system` branch so other previews are unaffected.

```
vercel env add NEXT_PUBLIC_READER_DS preview   # value: 1  (or branch-scoped)
```

---

## Known limitations / remaining refinements

- Only the homepage is implemented; 53 screens remain (mapped, phased — audit §9).
- Desktop (≥1024px) currently renders the mobile column full-bleed; premium desktop editorial grid is Phase 6.
- Listen/share/save actions are present as buttons with `data-action` hooks; behaviour wiring is a later phase.
- Utility-row weather/rates use placeholders pending a real data source.
- Local dev seed only fills `editorsPicks`; category/trending/regional sections collapse gracefully (production feed is rich).
- Unit/integration/E2E/a11y test suites and cross-viewport (360–1440) verification are Phase 7.

---

## Rollback procedure

1. **Preview:** delete/ignore the preview; nothing in production changed.
2. **If ever merged:** `git revert 1275475` (or the merge commit) on `main`, or reset to `rollback/reader-design-20260719` (`33d1cb1`) and redeploy.
3. **Flag kill-switch:** remove/unset `NEXT_PUBLIC_READER_DS` — instantly reverts all surfaces to the existing reader UI without a code change.

---

## Recommended next steps

1. Set the Preview/branch-scoped flag and confirm the preview renders the new homepage.
2. Approve continuation to Phase 2 (district, category, latest, trending, search, topic, live, district selector).
3. Merge-to-main + production deploy remain gated on your explicit go-ahead after full test coverage.
