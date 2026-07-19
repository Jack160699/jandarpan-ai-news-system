# Phase 6 — Query After

## Changes

### Generated pool (`src/lib/newsroom/generated/read.ts`)

| Mode | Columns | Hard cap | Body? |
|---|---|---:|---|
| `full` | full article | 120 | yes |
| `homepage` | feed fields | 160 | no |
| `sitemap` | slug + lastmod | 400 | no |
| `slug` | slug only | 400 | no |
| `summary` | id/status | 1 | no |

- App timeout **4s**, retries **0** via `safeQuery`
- Keyset cursor: `cursorPublishedAt` → `published_at < cursor`
- `getGeneratedArticleSlugs` / sitemap use slim projections

### Health summary (`pool-summary.ts` + `checkSupabase`)

- LIMIT 1 latest published + exact head counts (published / pending)
- 900ms per probe, **30s** single-flight cache
- On timeout: **last-known** summary (degraded, not blank)

### Sitemap (`sitemap-data.ts`)

- `fetchSitemapGeneratedArticles` (cap 400, no body)
- Query budget **3.5s**; warm in-process cache **5 min**
- Stable `lastModified` from `published_at`
- Cleared on `revalidateNewsroomCaches`

### Admin shell

- Continues to share `getCanonicalHealth()` — no duplicate pool fetch from header/page
- Heavy diagnostics remain on-demand (`/api/admin/ops/health`)

## Expected result sizes

| Path | Rows / payload |
|---|---|
| Health summary | 0–1 row + 2 head counts |
| Homepage pool | ≤160 slim rows |
| Sitemap stories | ≤400 slug/lastmod rows |
| Google News | ≤200 slim rows (48h window) |

## Targets vs design

| Target | Mechanism |
|---|---|
| Health &lt; 1.5s | Bounded probes + 30s cache + 1.2s source budget |
| Pool summary &lt; 1s | 900ms probe timeouts |
| System status &lt; 1.5s | Canonical health cache |
| Notifications &lt; 1s cached | Shared canonical health |
| Warm sitemap &lt; 2s | 5 min module cache |
| No 57014 on tested paths | Caps + projections + indexes + early timeout |
