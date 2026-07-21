# Phase 4 visual audit — Reader experience & personalization (C21–C25, D26/D29–D35)

**Branch:** `feat/jandarpan-reader-design-system`  
**Commit:** `ab4416c7`  
**Preview:** https://newspaper-motion-aky60zk57-jack160699s-projects.vercel.app  
**Branch alias:** https://newspaper-motion-git-feat-jandarpan-b9dd37-jack160699s-projects.vercel.app  
**Flag:** `NEXT_PUBLIC_READER_DS=1`  
**Viewport:** 390×844  
**Design source:** Plot Design `groupC()` / `groupD()`  
**Approved static HTML:** `public/design-refs/phase-4/approved-phase-4-screens.html`  
**Screenshot dir:** `docs/jandarpan-reader-redesign/screenshots/phase-4/`  
**Feature root:** `src/features/reader-ds/experience/`

## Architecture

| Concern | Implementation |
|---------|----------------|
| Shared chrome | `ReaderShell` → `ExperienceChrome` (`AudioProvider` + `MiniPlayer` + `FullPlayer` + prefs boot) |
| Audio briefing | `ListenBriefingPage` + `tracksFromShorts` / homepage fallback via `loadListenTracks` |
| Queue / speed | `AudioQueuePage` — speed cycle, autoplay, Wi‑Fi download toggles |
| Downloads | `DownloadsPage` — local marked-offline IDs in `jd-ds-experience-prefs` |
| Profile hub | `ProfileHubPage` at `/archive` |
| Saved / history | Reading memory (`chronicle-reading-memory`) + feed catalog lookup |
| Followed topics | `feedInterests` + `syncInterestsCookie` |
| Notifications | Experience prefs bridged to profile-v3 overlapping keys |
| Language | `savePreferences` + `saveStoredLanguage` |
| Districts | `homeDistrict` + homepage-layout followed districts + cookie sync |
| Accessibility / data-saving | Font scale, contrast, theme mode, `data-data-saving` on document |
| AppChrome opt-out | Exact `/listen`, `/archive` + prefixes `/listen/`, `/archive/` |

## Screen-by-screen

| Screen | Design ref | Route | Screenshots | Major differences found | Fixes made | Remaining mismatch | Functional verification |
|--------|------------|-------|-------------|-------------------------|------------|--------------------|-------------------------|
| C21 Top-10 briefing | groupC C21 | `/listen` | `c21-briefing-*` | Shorts pool threw without Supabase → legacy listen HTML | DS path first; `loadListenTracks` try/catch → homepage tracks; dedupe | Track count/duration from real feed (not mock “10 · 8 मिनट”) | Pass — play-all, queue/downloads links, active nav |
| C22 Mini player | groupC C22 | sticky above bottom nav | `c22-mini-player-*` | Capture needed client play state | Mini player fixed above nav; gold top border | Full-bleed home context in mock vs listen host | Pass when play starts — expand opens full |
| C23 Full player | groupC C23 | overlay | `c23-full-player-*` | Dark overlay + scrub / ±15 / speed | `FullPlayer` dialog chrome | Sleep timer UI decorative until wired | Pass — close, seek, speed cycle, queue link |
| C24 Queue + speed | groupC C24 | `/listen/queue` | `c24-queue-*` | Matches settings rows + up-next list | Toggles persist experience prefs | Reorder handle visual (no DnD API invented) | Pass — speed, autoplay, wifi toggles |
| C25 Downloads | groupC C25 | `/listen/downloads` | `c25-downloads-*` | Empty until mark; storage bar | Mark briefing / clear all; green ready state | Byte estimates approximate | Pass — mark/clear; no fake CDN downloads |
| D26 Language | groupD D26 | `/archive/language` | `d26-language-*` | Marathi available (real i18n); Odia coming soon | Continues to `/archive` | Mock had Marathi as “जल्द” | Pass — select + persist |
| D29 Profile hub | groupD D29 | `/archive` | `d29-profile-*` | Extra rows (language, districts, notifications) | Shared `SettingRow` list + premium promo | Guest name “पाठक” not mock personal name | Pass — links to all prefs |
| D30 Saved | groupD D30 | `/archive/saved` | `d30-saved-*` | Empty until bookmarks; filter chips view-only | Remove via reading-memory toggle | Offline badge when no offline meta | Pass — remove; chips |
| D31 History | groupD D31 | `/archive/history` | `d31-history-*` | Empty until reads; day buckets | Clear history on device | Titles unresolved if slug left feed | Pass — clear; open story |
| D32 Followed | groupD D32 | `/archive/followed` | `d32-followed-*` | Suggestions + interest toggles | Cookie sync on change | Mock topic names differ from interest ids | Pass — follow/unfollow |
| D33 Notifications | groupD D33 | `/archive/notifications` | `d33-notifications-*` | Matches category toggles + quiet hours | Bridge breaking/briefing to profile-v3 | Quiet hours window fixed copy | Pass — toggles persist |
| D34 Districts | groupD D34 | `/archive/districts` | `d34-districts-*` | Primary + add/remove others | Cookie + layout sync | Auto-locate toggle local-only (no geo invent) | Pass — set primary |
| D35 Accessibility | groupD D35 | `/archive/accessibility` | `d35-accessibility-*` | Data-saving + font slider + contrast/theme | `ArticleImage` respects `data-data-saving` | Theme “system” cycles light/dark | Pass — data-saving blocks images |

## Shared fixes

1. **Listen without Supabase:** DS route no longer calls `fetchShortsPool` before fallback; homepage headlines seed the briefing.
2. **Audio state:** `tracksRef` keeps `playAt` / `playAll` in sync when seeding tracks from the page.
3. **AppChrome:** `/listen` and `/archive` (and children) opt out of legacy chrome under the flag.
4. **Aliases:** `/saved` → `/archive/saved`; `/notifications` → `/archive/notifications` when DS on.

## Functional checklist

| Check | Result |
|-------|--------|
| Play all / per-track play | Pass (client) |
| Mini → full player | Pass |
| Queue speed / autoplay / wifi toggles | Pass |
| Downloads mark / clear | Pass (local marked offline) |
| Saved remove | Pass |
| History clear | Pass |
| Follow / unfollow | Pass |
| Notification toggles | Pass |
| Language continue | Pass |
| District primary | Pass |
| Data-saving blocks images | Pass |
| Responsive 390 width | Pass |
| Real data only (no invented news) | Pass |

## Limitations (genuine)

- Audio often simulates progress when no `voiceStreamPath` is available (no fake news audio invented).
- Downloads are device-marked offline IDs + size estimates — not a new offline CDN.
- D27 onboarding and D28 sign-in were out of Phase 4 scope (profile links to `/login`).
- Capture scripts must use `localhost` (not `127.0.0.1`) so Next.js 16 allows client/HMR resources (`allowedDevOrigins`).

## Capture

```bash
# NEXT_PUBLIC_READER_DS=1 npm run dev -- -p 3000
# npx serve public -l 3456
node scripts/capture-phase-4-screens.mjs
```
