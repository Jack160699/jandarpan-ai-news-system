# RC1-002 — Search System Consolidation Report

**Project:** Phoenix  
**Date:** 2026-07-11  
**Objective:** Eliminate duplicate search architecture; single owner at `src/features/search-v3/`

---

## Executive Summary

Search is now owned by **`src/features/search-v3/core/`**. All client-side API calls, debounced fetch logic, filter constants, keyboard navigation, history management, command-palette item builders, and overlay routing flow through this layer.

Legacy entry points (`components/reader/SearchOverlay`, `layouts/SearchOverlay`) are **thin wrappers** with no duplicated rendering or fetch logic. Production UI, APIs, and endpoints are unchanged.

---

## Canonical Architecture

```
src/features/search-v3/
├── core/                          ← SINGLE OWNER (RC1-002)
│   ├── api.ts                     fetchSearch, buildSearchParams, buildSearchUrl
│   ├── SearchState.ts             useSearchState (debounced query + filters)
│   ├── SearchHistory.ts           useSearchHistory
│   ├── SearchFilters.ts           shared district/category constants
│   ├── SearchKeyboard.ts          useSearchKeyboard (wrap + clamp modes)
│   ├── SearchCommands.ts          command palette item builders
│   ├── SearchProvider.tsx         optional context for nested surfaces
│   ├── SearchOverlay.tsx          canonical overlay router (reader | layout | V3)
│   └── index.ts
├── SearchExperienceV3.tsx         V3 presentation composer
├── SearchOverlayV3.tsx             V3 overlay shell
├── components/                    V3 UI components (unchanged markup)
├── hooks/                         re-exports → core (backward compat)
├── constants.ts                   full district/topic lists
└── config.ts                      isSearchV3Enabled()
```

### Surface routing

| Surface | Entry | Core dependency |
|---------|-------|-----------------|
| **Production overlay** | `components/reader/SearchOverlay` → `core/SearchOverlay` (variant=`reader`) | ✅ |
| **JDP-002 overlay** | `layouts/SearchOverlay` → `core/SearchOverlay` (variant=`layout`) | ✅ |
| **V3 overlay** | `SearchOverlayV3` → `SearchExperienceV3` | `useSearchState`, `buildSearchUrl` |
| **Search page** | `app/search/page.tsx` | `SearchExperienceV3` or legacy `SearchPanel` |
| **Legacy panel** | `components/search/SearchPanel` | `useSearchState` (skipIdleFetch), `useSearchHistory`, `LEGACY_FILTER_*` |
| **Command palette** | `layouts/CommandPalette` | `buildSearchCommandItems`, `fetchSearch`, `useSearchKeyboard` (clamp) |
| **Global search API** | `GET /api/search` | unchanged — `lib/search/*` |

---

## Duplicates Eliminated

| Before | After |
|--------|-------|
| Duplicate overlay shells (~90% identical reader vs layouts) | Single `core/SearchOverlay.tsx` with `variant` prop |
| `SearchPanel` inline fetch/debounce (~80 lines) | `useSearchState` in core |
| `useSearchV3` duplicate fetch logic | Thin re-export of `useSearchState` |
| Inline keyboard nav in CommandPalette | `useSearchKeyboard` with `mode: "clamp"` |
| Filter constants in 5+ files | `SearchFilters.ts` (+ legacy aliases for unchanged UI) |
| 3 separate `/api/search` client fetch implementations | Single `fetchSearch()` in `core/api.ts` |

---

## Files Modified

### Created
- `src/features/search-v3/core/api.ts`
- `src/features/search-v3/core/SearchState.ts`
- `src/features/search-v3/core/SearchHistory.ts`
- `src/features/search-v3/core/SearchFilters.ts`
- `src/features/search-v3/core/SearchKeyboard.ts`
- `src/features/search-v3/core/SearchCommands.ts`
- `src/features/search-v3/core/SearchProvider.tsx`
- `src/features/search-v3/core/SearchOverlay.tsx`
- `src/features/search-v3/core/index.ts`
- `docs/RC1-002-SEARCH-ARCHITECTURE-REPORT.md`

### Refactored (use core)
- `src/features/search-v3/SearchExperienceV3.tsx`
- `src/features/search-v3/components/SearchResults.tsx`
- `src/features/search-v3/components/FilterChips.tsx`
- `src/features/search-v3/components/RecentSearches.tsx`
- `src/features/search-v3/hooks/useSearchV3.ts` → re-export
- `src/features/search-v3/hooks/useSearchKeyboard.ts` → re-export
- `src/features/search-v3/index.ts`
- `src/components/search/SearchPanel.tsx`
- `src/components/reader/SearchOverlay.tsx` → thin wrapper
- `src/layouts/SearchOverlay/SearchOverlay.tsx` → thin wrapper
- `src/layouts/CommandPalette/CommandPalette.tsx`

### Unchanged (by design)
- `GET /api/search` route and `src/lib/search/*` backend
- V3 component markup and CSS
- Legacy `SearchPanel` / `SearchHitCard` visual presentation
- Feature flag `NEXT_PUBLIC_SEARCH_V3`

---

## Deprecated (backward-compatible)

| Path | Status | Migration |
|------|--------|-----------|
| `features/search-v3/hooks/useSearchV3.ts` | Deprecated re-export | Use `useSearchState` from `@/features/search-v3/core` |
| `features/search-v3/hooks/useSearchKeyboard.ts` | Deprecated re-export | Use `useSearchKeyboard` from `@/features/search-v3/core` |
| Inline overlay logic in reader/layouts | Removed | Import `SearchOverlay` from core or existing public paths |

Public imports from `@/features/search-v3` and `@/components/reader` continue to work.

---

## Migration Notes

### For new search surfaces

```tsx
import {
  useSearchState,
  useSearchHistory,
  useSearchKeyboard,
  SearchOverlay,
  SearchProvider,
  fetchSearch,
  buildSearchUrl,
} from "@/features/search-v3/core";
```

### Overlay variants

```tsx
// Production (MainHeader) — default
<SearchOverlay variant="reader" />

// JDP-002 AppShell
<SearchOverlay variant="layout" />
```

### Legacy vs V3 fetch behavior

- **V3 / default:** `useSearchState()` — always fetches (idle trending home)
- **Legacy panel:** `useSearchState({ skipIdleFetch: true })` — preserves prior idle behavior

### Command palette keyboard

Use `useSearchKeyboard({ mode: "clamp", initialActiveIndex: 0 })` for palette-style lists.

---

## Verification

| Check | Status |
|-------|--------|
| `npm run typecheck` | ✅ Pass |
| `npm run build` | ✅ Pass |
| Client `/api/search` fetch sites | ✅ Single owner (`core/api.ts`) |
| Production regression risk | Low — UI/API unchanged; logic consolidated only |

---

## Remaining Presentation Layers (intentional)

These are **not** duplicated logic — they are surface-specific renderers:

- `components/search/SearchHitCard.tsx` — legacy result card styling
- `features/search-v3/components/ArticleSearch.tsx` — V3 result card styling
- `components/search/SearchResultsList.tsx` — SSR results wrapper (legacy page)
- `features/search-v3/components/SearchResults.tsx` — V3 results with keyboard nav

Future RC may unify result cards behind a shared data component; out of scope for RC1-002 (architecture only, no UI redesign).

---

## Rollback

Revert this commit/PR. Feature flag behavior is unchanged — `NEXT_PUBLIC_SEARCH_V3=0` continues to serve legacy `SearchPanel` through the canonical overlay router.
