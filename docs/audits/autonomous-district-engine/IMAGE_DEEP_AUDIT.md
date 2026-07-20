# Image deep audit — Stage 1 integration

**Window:** published last 7 days (n=40)  
**Probed:** 2026-07-20

## Classification (before repair)

| Class | Count | Notes |
|---|---:|---|
| Broken Unsplash `photo-1524492412937` | 31 | HTTP 404 |
| Broken relative `/editorial/civic-office.jpg` | 9 | 404 on production (asset missing) |
| OpenAI/temp provider URL | 0 | |
| Preview URL leakage | 0 | |
| Missing hero | 0 | |
| Valid reachable hero | 0 | **confirmed failure** |

## EDITORIAL_IMAGES stock probe

| Key | Status |
|---|---|
| civicOffice | OK 200 image/jpeg |
| raipurCity (old) | **404** → replaced with brand OG |
| schoolIndia | OK |
| assemblyPolitics | OK |
| ruralHealth | OK |
| metroStreet | OK |
| steelIndustry | OK |
| cricketGround (old) | **404** → replaced |
| folkCulture (old) | **404** → replaced |
| waterCivic (old) | **404** → replaced |
| pressConference | OK |
| newsroomDesk | OK |

Durable brand OG: `https://www.jandarpan.news/brand/jan-darpan-chhattisgarh-og.png` → 200 image/png

## Bounded repair (executed)

- Scope: last 48h broken/missing + remaining 7d same broken URL patterns
- Manual locks: not overwritten
- Result after repair: brand_og=38, newsroom=2, still_broken=0 / 40

## Storage health

| Check | Result |
|---|---|
| Project | `giiuqshoconjbpiueasp` (newspaper-motion) |
| Bucket | `editorial-images` public |
| Existing object public GET | 200 image/webp, cache-control immutable |
| Write/delete unique probe | **BLOCKED** locally — Vercel `env pull` returned empty secret values; CLI `storage cp` unsupported for ss:// in installed CLI |
| Preview leakage | none observed on repaired heroes |

## Stale queue jobs

Three pending jobs (attempts=0) had articles with heroes already → marked `completed` with recovery note `stage1_stale_pending_with_existing_hero`.

## Funnel (7d snapshot)

| Image stage | Count | Notes |
|---|---:|---|
| published | 40 | |
| image job enqueued (historical) | 493 completed + 3 repaired | |
| public URL reachable (after repair) | 40/40 | brand OG / newsroom |
| storage AI objects (recent) | sparse since Jul 4 | older pipeline |

## Confirmed failures vs risks

**Confirmed:** mass broken Unsplash + missing relative editorial path (fixed by repair + code URL update).  
**Risk:** Unsplash stock remains fragile; prefer durable site/brand/storage URLs going forward.
