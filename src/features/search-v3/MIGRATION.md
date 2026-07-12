# JDP-008 — Global Search Experience V3 Migration Guide

## Overview

Search Experience V3 is a complete **presentation** redesign for global search. It consumes the existing `GET /api/search` endpoint and `src/lib/search/*` types — no backend or API changes.

**Default:** OFF. Production is unchanged until you opt in.

---

## Activation

Set in `.env.local` or Vercel environment variables:

```bash
NEXT_PUBLIC_SEARCH_V3=1
```

Restart the dev server after changing public env vars.

| Value | Behavior |
|-------|----------|
| unset / `0` | Legacy `SearchPanel` (production default) |
| `1` | `SearchExperienceV3` + `SearchOverlayV3` |

---

## Architecture

```
/search page
  └─ [V3 OFF] SearchPanel + SearchResultsList
  └─ [V3 ON]  SearchExperienceV3 (full page)

Search overlay (header / home explore)
  └─ [V3 OFF] SearchOverlay → SearchPanel
  └─ [V3 ON]  SearchOverlayV3 → SearchExperienceV3 (compact)
```

### V3 sections

1. **Search Home** — recent searches, trending, district shortcuts, topic shortcuts
2. **Filter Chips** — district, category, today/week time scope
3. **Article Search** — keyboard-navigable result cards
4. **Voice Search** — placeholder (coming soon)
5. **Loading / Empty / Error** — accessible states

---

## File structure

```
src/features/search-v3/
├── core/                         # RC1-002 — single search owner
│   ├── api.ts                    # fetchSearch, buildSearchUrl
│   ├── SearchState.ts            # useSearchState
│   ├── SearchHistory.ts          # useSearchHistory
│   ├── SearchFilters.ts          # shared filter constants
│   ├── SearchKeyboard.ts         # useSearchKeyboard
│   ├── SearchCommands.ts         # command palette builders
│   ├── SearchProvider.tsx        # optional context
│   ├── SearchOverlay.tsx         # canonical overlay router
│   └── index.ts
├── SearchExperienceV3.tsx        # Main composer
├── SearchOverlayV3.tsx           # Modal overlay shell
├── index.ts
├── config.ts                     # isSearchV3Enabled()
├── constants.ts                  # Districts, topics, categories
├── hooks/
│   ├── useSearchV3.ts            # → re-exports useSearchState
│   └── useSearchKeyboard.ts      # → re-exports core
├── components/
│   ├── SearchHome.tsx
│   ├── RecentSearches.tsx
│   ├── TrendingSearches.tsx
│   ├── DistrictSearch.tsx
│   ├── TopicSearch.tsx
│   ├── ArticleSearch.tsx
│   ├── VoiceSearchPlaceholder.tsx
│   ├── FilterChips.tsx
│   ├── SearchResults.tsx
│   ├── SearchEmpty.tsx
│   ├── SearchLoading.tsx
│   └── SearchError.tsx
├── styles/search-v3.css
└── MIGRATION.md
```

See also: `docs/RC1-002-SEARCH-ARCHITECTURE-REPORT.md`

---

## Dependencies (read-only)

| Layer | Usage |
|-------|-------|
| **JDP-001** | `Search`, `Chip`, `Skeleton`, `EmptyState`, `Button`, `SectionHeader` |
| **Existing API** | `GET /api/search` — same params: `q`, `district`, `category`, `time`, `limit` |
| **Existing lib** | `src/lib/search/types.ts`, `history.ts` |
| **i18n** | `useLanguage()` dictionary strings |

**Do not modify** existing API routes or search engine code.

---

## Accessibility

- Combobox input with `aria-expanded` and `aria-controls`
- Results listbox with `aria-activedescendant`
- Arrow Up/Down + Enter keyboard navigation
- Focus trap in overlay (Tab cycle, Escape dismiss)
- `aria-live` on loading and result counts
- Voice button is `disabled` with descriptive `aria-label`

---

## Rollout checklist

- [ ] Set `NEXT_PUBLIC_SEARCH_V3=1` in Preview environment
- [ ] Verify search home (recent, trending, districts, topics)
- [ ] Verify filter chips update results
- [ ] Test keyboard navigation in results
- [ ] Test overlay on mobile + desktop
- [ ] Test light + dark mode
- [ ] Run `npm run typecheck` and `npm run build`
- [ ] Promote to production when satisfied

---

## Rollback

Remove or set `NEXT_PUBLIC_SEARCH_V3=0`. Legacy `SearchPanel` renders immediately.
