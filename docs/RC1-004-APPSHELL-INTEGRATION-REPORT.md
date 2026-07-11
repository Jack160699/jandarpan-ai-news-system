# RC1-004 — Master AppShell Integration Report

**Project:** Phoenix  
**Date:** 2026-07-11  
**Objective:** Migrate production reader chrome from legacy `AppLayout` stack to JDP-002 `AppShell` without breaking routes, providers, or business logic.

---

## Executive Summary

Production reader chrome now flows through **JDP-002 `AppShell`**. `AppLayout` is a thin bridge that composes `AppShell` with `CategoryNavbar` and the homepage sticky-stack portal slot. `AppChrome` remains the outer orchestrator (providers, ads, onboarding, pull-to-refresh, story/shorts/admin routing modes).

**Verdict: GO** for Release Candidate 1 — with documented UX deltas (bottom nav model, search entry point) tracked for post-RC polish.

---

## Phase 1 — Repository Inspection

### Dependency Graph

```mermaid
flowchart TB
  subgraph server ["Server (RSC)"]
    RL["src/app/layout.tsx"]
    TS["ThemeScript"]
    LGS["LanguageGateScript"]
  end

  subgraph clientRoot ["Client boundary"]
    TR["TenantRoot"]
    RPP["ReaderPreferencesProvider"]
    LP["LanguageProvider"]
    AC["AppChrome"]
  end

  subgraph readerProviders ["Reader providers (AppChrome)"]
    EIP["EditorialIntelligenceProvider"]
    HLP["HeadlinesListenProvider"]
    ASP["ArticleSpeechProvider"]
    NP["NavigationProvider"]
    RAP["ReaderAccountProvider"]
    NTL["NativeTouchLayer"]
  end

  subgraph shellBridge ["Shell bridge"]
    AL["AppLayout"]
    AS["AppShell"]
    SP["ShellProvider"]
  end

  subgraph chrome ["JDP-002 chrome"]
    DS["DesktopSidebar"]
    TB["TopBar"]
    CN["CategoryNavbar"]
    BN["BottomNavigation"]
    CP["CommandPalette"]
    SO["SearchOverlay"]
    SMD["SuperMenuDrawer"]
  end

  subgraph content ["Preserved page layer"]
    PTR["PullToRefresh"]
    SR["ScrollRetention"]
    RT["RouteTransition"]
    PAGE["Route pages"]
  end

  RL --> TS --> LGS --> TR --> RPP --> LP --> AC
  AC --> EIP --> HLP --> ASP --> NP --> RAP --> NTL
  NTL --> AL --> AS --> SP
  AS --> DS
  AS --> TB
  AS --> CN
  AS --> BN
  AS --> CP
  AS --> SO
  AS --> SMD
  AL --> PTR --> SR --> RT --> PAGE
```

### Layout hierarchy (6 files)

| File | Role |
|------|------|
| `src/app/layout.tsx` | Root — tenant, reader prefs, language, AppChrome |
| `src/app/login/layout.tsx` | Metadata passthrough |
| `src/app/profile/layout.tsx` | Metadata passthrough |
| `src/app/saved/layout.tsx` | Metadata passthrough |
| `src/app/admin/layout.tsx` | Admin auth guard + AdminRuntimeRoot |
| `src/app/admin/login/layout.tsx` | Login wrapper |

### Hydration boundaries

| Layer | Server / Client | Notes |
|-------|-----------------|-------|
| `layout.tsx` | Server | `suppressHydrationWarning` on `<html>` |
| `TenantRoot` → `AppChrome` | Client | First client boundary |
| `AppLayout` → `AppShell` | Client | ShellProvider + scroll hooks |
| `CommandPalette`, `SearchOverlay`, `SuperMenuDrawer` | Client + dynamic `ssr: false` | Lazy overlays |
| `PageContainer`, `ContentContainer` | Server | Safe inside RSC pages |

### Suspense boundaries (page-level, unchanged)

Homepage, shorts, live-v3, district-v3, morning-brief, notifications — all retain existing `<Suspense>` at page level. No new shell-level Suspense added.

---

## Phase 2 — Compatibility Matrix

| Old Component | Replacement | Risk | Rollback |
|---------------|-------------|------|----------|
| `AppLayout` internals (`MainHeader`, `CategoryNavbar` inline, `BottomMobileNav`) | `AppShell` + `TopBar` + `BottomNavigation` + `DesktopSidebar` | **Medium** | Revert `AppLayout.tsx` |
| `MainHeader` | `TopBar` | **Low** | Restore MainHeader import in AppLayout |
| `BottomMobileNav` | `BottomNavigation` | **Medium** — different tab model | Restore BottomMobileNav in AppLayout |
| `MainHeader` → `SearchOverlay` (reader variant) | `CommandPalette` + layout `SearchOverlay` | **Low** — canonical search-v3 router | Revert TopBar search trigger |
| Inline `SuperMenuDrawer` in AppLayout | `SuperMenuDrawer` in AppShell | **Low** — same component, single mount | Revert AppLayout |
| `useHeaderScrolled` / `useDockScrollHide` | `useTopBarScrolled` / `useShellScrollHide` | **Low** | CSS-only |
| `navigation/PageShell` (orphan) | `layout/PageShell` (unchanged) | **None** | N/A |
| `SiteChrome` | — | **None** — already deleted | N/A |
| Admin `AdminShell` | Unchanged | **None** | N/A |
| Shorts `ShortsLanguageShell` | Unchanged | **None** | N/A |

---

## Phase 3 — Provider Integration

### Root provider order (unchanged)

```
TenantRoot
  └── ReaderPreferencesProvider
        └── LanguageProvider
              └── AppChrome
```

### AppChrome nested providers (unchanged)

```
EditorialIntelligenceProvider
  └── HeadlinesListenProvider
        └── ArticleSpeechProvider
              └── NavigationProvider
                    └── ReaderAccountProvider
                          └── NativeTouchLayer
```

### New provider (shell-scoped only)

```
AppShell
  └── ShellProvider  ← NEW (command palette, sidebar state)
```

**Verification:** No duplicate `ReaderPreferencesProvider`, `NavigationProvider`, `TenantProvider`, or `LanguageProvider`. `ShellProvider` is additive and scoped to reader chrome only.

| Provider | Status |
|----------|--------|
| ThemeProvider (JDS) | Unchanged — design-system preview only |
| Theme (production) | Unchanged — `ThemeScript` + `ReaderPreferencesProvider` |
| Supabase | Unchanged — hook-based, no React provider |
| Analytics | Unchanged — event collector + story tracker |
| Search | Unchanged — `ReaderPreferencesProvider.searchOpen` + search-v3 canonical overlay |
| Notifications | Unchanged — feature-flagged href in TopBar |
| Accessibility | Unchanged — SkipLink, LanguageGate in AppChrome |

---

## Phase 4 — Navigation Integration

### Production chrome (post-integration)

| Surface | Component | Viewport |
|---------|-----------|----------|
| Top bar | `TopBar` | All |
| Category rail | `CategoryNavbar` (via `categoryRail` prop) | All |
| Desktop sidebar | `DesktopSidebar` | lg+ |
| Bottom nav | `BottomNavigation` | < lg |
| Command palette | `CommandPalette` | All (Cmd+K) |
| Search overlay | `SearchOverlay` (layout variant) | When `searchOpen` |
| Super menu | `SuperMenuDrawer` | Menu actions |

### Deprecated (retained for rollback)

- `MainHeader` — `@deprecated RC1-004`
- `BottomMobileNav` — `@deprecated RC1-004`

### Documented UX delta

| Item | Legacy | AppShell |
|------|--------|----------|
| Bottom tabs | Home · Listen · Reels · Live · Menu | Home · District · AI · Alerts · You |
| Mobile search | `setSearchOpen(true)` sheet | Command palette (⌘K / search button) |
| Desktop nav | Header only | Sidebar + category rail + command palette |

Routes `/listen`, `/shorts`, `/search`, `/archive` remain reachable via command palette, sidebar, category rail, and SuperMenu. No route deletion.

---

## Phase 5 — Layout Integration

### Changed files

| File | Change |
|------|--------|
| `src/components/layout/AppLayout.tsx` | Delegates to `AppShell` |
| `src/layouts/AppShell/AppShell.tsx` | `data-stack-mode`, header layer, `jdp-shell--no-bottom-nav` |
| `src/layouts/TopBar/TopBar.tsx` | Theme toggle, desktop menu, command palette search |
| `src/layouts/styles/shell.css` | Padding dedup, nested sticky fix, story mode padding |

### Unchanged

- `AppChrome.tsx` — still wraps `AppLayout`; ads, onboarding, pull-to-refresh preserved
- All `page.tsx` implementations
- Admin, shorts, design-system routing modes
- SEO metadata generation

### Preserved DOM contracts

| Contract | Status |
|----------|--------|
| `#app-sticky-stack` | ✅ AppShell sticky stack |
| `#home-stack-slot` | ✅ `homeStackSlot` prop on homepage |
| `.app-feed` | ✅ `jdp-shell__feed app-feed` |
| `#main-content` | ✅ Via `PageContainer` / `PageShell` |
| `data-stack-mode="home"` | ✅ Set on homepage |
| `data-has-ticker` | ✅ HomepageStackPortal unchanged |

---

## Phase 6 — Routing Verification

All routes build successfully (118 pages). Key reader routes:

| Route | Shell mode | Status |
|-------|------------|--------|
| `/` | Full AppShell + home stack | ✅ |
| `/story/[slug]` | Full — bottom nav hidden | ✅ |
| `/search` | Full | ✅ |
| `/live`, `/live/[slug]` | Full | ✅ |
| `/profile`, `/login`, `/saved` | Full | ✅ |
| `/archive` | Full | ✅ |
| `/district/[slug]` | Full | ✅ |
| `/admin/*` | Minimal (passthrough) | ✅ |
| `/shorts` | ShortsLanguageShell (no AppLayout) | ✅ |
| `/design-system` | Minimal | ✅ |

---

## Phase 7 — Hydration Report

| Check | Result |
|-------|--------|
| Duplicate client wrappers | ✅ Removed — single SuperMenuDrawer mount |
| `data-hydrated` on AppChrome | ✅ Unchanged |
| Dynamic imports `ssr: false` | ✅ CommandPalette, SearchOverlay, SuperMenuDrawer |
| Portal targets (`#home-stack-slot`) | ✅ Present before HomepageStackPortal effect |
| Theme flash | ✅ ThemeScript pre-hydration unchanged |
| Nested sticky conflicts | ✅ Fixed — `.jdp-shell__sticky-stack .jdp-topbar { position: relative }` |

No new hydration warnings introduced in build output.

---

## Phase 8 — Performance Report

| Check | Result |
|-------|--------|
| Duplicate providers | ✅ None |
| Duplicate SuperMenuDrawer | ✅ Single mount in AppShell |
| Duplicate SearchOverlay | ✅ MainHeader overlay removed from tree |
| Duplicate scroll listeners | ✅ `useScrollPosition` in AppShell only |
| Double bottom padding | ✅ Fixed in shell.css |
| Layout shift | ✅ Fixed chrome heights; safe-area pre-calculated |
| Lazy overlays | ✅ Command palette + search + menu on demand |

---

## Phase 9 — Accessibility Report

| Feature | Status |
|---------|--------|
| Skip link | ✅ `SkipLink` in AppChrome (unchanged) |
| Landmarks | ✅ `role="banner"` on TopBar, `aria-label` on nav regions |
| Focus rings | ✅ JDS `--jds-focus-ring` on shell controls |
| Keyboard nav | ✅ Cmd+K command palette, sidebar toggle, bottom nav |
| Command palette | ✅ `aria-activedescendant`, arrow keys, Escape |
| Reduced motion | ✅ Scroll-hide disabled in `prefers-reduced-motion` |
| Safe areas | ✅ `env(safe-area-inset-*)` on bottom nav |
| Theme toggle | ✅ Restored in TopBar with `aria-pressed` |
| Story immersive | ✅ `app-shell--story` + `jdp-shell--no-bottom-nav` |

---

## Phase 10 — Rollback Strategy

### One-commit rollback

```bash
git revert <RC1-004-commit-sha>
```

Or manually restore `src/components/layout/AppLayout.tsx`:

```tsx
// Legacy production shell (pre-RC1-004)
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { MainHeader } from "./MainHeader";
import { CategoryNavbar } from "./CategoryNavbar";
import { BottomMobileNav } from "./BottomMobileNav";
import { APP_STICKY_STACK_ID, HOME_STACK_SLOT_ID } from "@/lib/layout/stack-heights";

const SuperMenuDrawer = dynamic(
  () => import("@/components/super-menu/SuperMenuDrawer").then((m) => ({ default: m.SuperMenuDrawer })),
  { ssr: false, loading: () => null }
);

export function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isHome = pathname === "/";
  return (
    <>
      <div id={APP_STICKY_STACK_ID} className="app-sticky-stack" data-stack-mode={isHome ? "home" : "chrome"}>
        <div className="app-sticky-stack__layer app-sticky-stack__layer--header"><MainHeader /></div>
        <div className="app-sticky-stack__layer app-sticky-stack__layer--category"><CategoryNavbar /></div>
        {isHome ? <div id={HOME_STACK_SLOT_ID} className="app-sticky-stack__layer app-sticky-stack__layer--home" /> : null}
      </div>
      <div className="app-feed">{children}</div>
      <BottomMobileNav />
      <SuperMenuDrawer />
    </>
  );
}
```

`MainHeader` and `BottomMobileNav` are retained in the repo with `@deprecated` markers.

---

## Validation Results

| Check | Result |
|-------|--------|
| TypeScript (`npm run typecheck`) | ✅ Pass |
| Build (`npm run build`) | ✅ Pass — 118 routes |
| ESLint (`npm run lint`) | ⚠️ Pre-existing warnings/errors (unrelated to RC1-004) |
| Duplicate providers | ✅ None detected |
| Route rendering | ✅ All routes in build output |
| Responsive layouts | ✅ Sidebar lg+, bottom nav < lg |
| Feature flags | ✅ `SEARCH_V3`, `NOTIFICATION_CENTER_V3` respected in TopBar |

---

## Release Candidate Scoring

| Dimension | Score (1–10) | Notes |
|-----------|--------------|-------|
| **Architecture** | 9 | Clean bridge pattern; single shell owner; providers preserved |
| **Maintainability** | 9 | Legacy components deprecated not deleted; documented rollback |
| **Performance** | 8 | Lazy overlays; padding dedup; one scroll hook — monitor command palette on low-end devices |
| **Accessibility** | 9 | Landmarks, keyboard, reduced motion, theme toggle restored |
| **Risk** | 7 | Bottom nav tab model change is the main UX delta |
| **Production Readiness** | 8 | Build + types pass; ESLint debt pre-exists; visual QA recommended |

### Weighted assessment: **8.2 / 10**

---

## GO / NO GO

### **GO** — Release Candidate 1

**Rationale:**
- Build and TypeScript pass
- No route regressions in production build
- Provider tree stable — no duplicates
- AppShell is the production reader shell
- Legacy shell safely deprecated with one-commit rollback
- DOM contracts preserved for homepage portal, story mode, and feed slot

**Post-RC follow-ups (non-blocking):**
1. Visual QA on mobile bottom nav tab model
2. Align `SHELL_BOTTOM_NAV` with product if Listen/Reels dock tabs are required
3. Delete deprecated `MainHeader` / `BottomMobileNav` after soak period
4. Remove orphan `navigation/PageShell`, `TopUtilityBar`, `MobileSheet`
5. Wire `QuickActions` FAB if product requests it

---

## Files Modified (RC1-004)

| File | Action |
|------|--------|
| `src/components/layout/AppLayout.tsx` | Rewired to AppShell |
| `src/layouts/AppShell/AppShell.tsx` | Stack mode, header layer, story padding class |
| `src/layouts/TopBar/TopBar.tsx` | Theme toggle, desktop menu |
| `src/layouts/styles/shell.css` | Padding dedup, sticky fix |
| `src/components/layout/MainHeader.tsx` | `@deprecated` marker |
| `src/components/layout/BottomMobileNav.tsx` | `@deprecated` marker |
| `src/layouts/README.md` | Production integration status |
| `docs/RC1-004-APPSHELL-INTEGRATION-REPORT.md` | This report |
