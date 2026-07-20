# Jan Darpan — Release blocker: Offline Downloads

**Branch:** `feat/jandarpan-reader-design-system`  
**Flag:** `NEXT_PUBLIC_READER_DS=1` (Preview)  
**Status:** PARTIALLY CLOSED — honest device packages + offline reader ship; full-site offline Next navigation is intentionally out of scope.

## Goal

Honest offline reading: readers can open **only** article packages that were explicitly downloaded to the device. No fake download buttons, no silent full-site offline.

## Architecture

| Layer | Technology | Role |
|--------|------------|------|
| Article bodies + metadata | IndexedDB `jd-offline-v1` / store `articles` | Full offline package per slug |
| Settings | IndexedDB store `meta` | Storage limit, max articles, last cleanup |
| Images | Cache Storage `jd-offline-images-v1` | Hero + inline image URLs present on the article |
| Shell navigations | Cache Storage `jd-offline-shell-v1` via `/jd-offline-sw.js` | `/archive/offline*`, `/offline-unavailable` only |
| UI / managers | `src/features/reader-ds/offline/*` | download, storage, cache, search, hooks |

### Managers

- **download-manager** — `downloadArticle`, `prepareRefresh` / `refreshArticle` (confirm required), `removeDownload`
- **storage-manager** — stats, `enforceStorageBudget`, `removeOldDownloads`, `deleteAllDownloads`, clear image cache
- **image-cache** — cache only URLs on the downloaded article
- **search** — offline query over downloaded packages only
- **OfflineServiceWorkerRegister** — registers minimal SW (not full-site offline)

### Routes (Reader DS on)

- `/archive/offline` — library (sort, search, remove)
- `/archive/offline/storage` — storage management
- `/archive/offline/read/[slug]` — offline reader from IndexedDB
- `/offline-unavailable` — SW fallback shell

When Reader DS is off, these routes redirect away (legacy untouched).

## Storage format (`OfflineArticleRecord`)

Stored fields: slug, downloadedAt, contentUpdatedAt, contentHash, language, district, category, headline, summary, paragraphs, heroImageUrl, imageCaption, author, role, publishedAt/publishedLabel, tags, kicker, bytes, favorite, inlineImageUrls, cachedImageUrls.

Bodies are **not** stored in `localStorage`.

## Limits

- Soft budget: **80 MB** total (text estimate + image cache)
- Max articles: **50**
- Cleanup removes oldest **non-favorite** packages first
- **Favorites are never silently deleted**

## Offline flow

1. Online article page → **Download offline** → package + images written to device  
2. Library lists only downloaded rows (size, date, language, district)  
3. Offline / forced offline → open `/archive/offline/read/[slug]`  
4. Banner **Offline Mode**; share & comments disabled; related stories omitted  
5. Missing slug → **Not available offline**  
6. Online again → downloads remain; **Check for update** requires confirm before overwrite  
7. Global search while offline routes to `/archive/offline?q=` (**Offline results**)

## Known limitations

- Not a full-site PWA offline shell — Next.js app chunks for arbitrary `/story/*` routes are not guaranteed offline; use `/archive/offline/read/[slug]`
- Image cache may miss CORS-blocked assets; text package still works
- Byte totals for images use content-length or arrayBuffer where available (estimate otherwise)
- Listen hub “downloads” remain separate (audio ID theater) — not this package
- Bookmarks (`/archive/saved`) are distinct from offline packages

## Testing

```bash
npm run typecheck
npm run lint
npm test -- src/features/reader-ds/offline/offline.test.ts src/features/reader-ds/i18n/strings.test.ts
NEXT_PUBLIC_READER_DS=1 npx playwright test e2e/reader-ds-offline.spec.ts
# Also: existing reader-ds smoke with flag on; flag-off redirect case in same spec file
```

Manual: airplane mode / DevTools Offline / `document.documentElement.setAttribute('data-jd-force-offline','1')`.

## Accessibility

- Download / remove / refresh keyboard-focusable buttons  
- `aria-live` progress and status on download control and storage actions  
- Offline Mode banner `role="status"`
