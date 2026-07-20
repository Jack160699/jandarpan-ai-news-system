# Stage 1 Integration

**Status:** IN PROGRESS (functional wiring landed; production remains gated)

Branch: `feat/autonomous-district-stage1-integration`

## What landed

| Area | Change |
|------|--------|
| District classification | `district-classifier.ts` + `tagGeoFromContent` integration; never force Raipur for state-govt-only |
| Signal geo column | `normalizedToSignal` writes `geo_metadata` + `ingestion_metadata.geo` |
| District repair | `district-repair.ts` dry-run / high-confidence apply (≥0.8, no manual lock) |
| Coverage cron | IST day bounds, real published/generated counts, `district_coverage_daily` upsert, shadow GNews plan |
| Official sources | Curated verified registry (`official-sources.ts`) — **no invented district URLs**; unverified hosts stay probation/disabled |
| GNews gap-first | Live fetch loads under-covered districts (coverage table → published counts fallback); EN+HI queries; statewide only when still empty |
| Human quality | Thresholds 82 / 70–81 / &lt;70; high-risk category stories require ≥90 (`held_for_safety`) |
| Evidence hold taxonomy | `held_for_evidence` / `held_for_contradiction` / `held_for_quality` / `held_for_safety` / `held_for_duplicate` |
| Evidence | Number claim scan + ledger summary on generate; optional `article_evidence_ledger` upsert |
| Update-existing | Material signal updates append `editorial_metadata.updates[]` without new URLs |
| Images | `resolveArticleDisplayImage` for story OG + homepage feed; MediaImage never blanks on failure |
| Capacity | `getEffectiveDailyLimit()` → 60 at stage_1; edition slots scaled ×1.5; district spacing 20m; soft 4/hour |
| Activation | `activateStage1(reason)` persists `autonomous_rollout_state` |

## Official sources honesty

- Verified entries are a **small curated set** (national portals, CG NIC/Samvad, confirmed district hosts).
- Remaining districts are **not** pre-filled with guessed `{slug}.gov.in` URLs.
- Unverified candidates must stay `probation` or `disabled` until discovery confirms the host.
- Prefer accuracy over claiming 33 verified district sources.

## How to activate stage_1

1. Ensure `AUTONOMOUS_KILL_SWITCH` is unset / false.
2. Persist DB singleton (preferred via guarded path):
   ```ts
   import { activateStage1 } from "@/lib/autonomous/rollout-state";
   await activateStage1("ops approval YYYY-MM-DD");
   ```
   Or manual SQL:
   ```sql
   update public.autonomous_rollout_state
   set stage = 'stage_1',
       reason = 'ops approval YYYY-MM-DD',
       updated_at = now()
   where id = 1;
   ```
3. Set deployment env: `AUTONOMOUS_ROLLOUT_STAGE=stage_1`  
   Runtime gates still read **process.env**; the DB row is the audit trail.
4. Optional: `GNEWS_GAP_FIRST=true` (default on when kill switch is off).
5. Confirm `getEffectiveDailyLimit()` returns **60**, edition slot sum tracks 60, and district spacing is 20 minutes.

## Safety preserved

- Shadow default unchanged when env unset
- Kill switch blocks publishing + stage_1 activation
- Step 3/4 safety paths untouched (no reader-design changes)
- Coverage cron remains plan/persist in shadow (no publish volume increase until stage_1 env is set)

## Blockers / follow-ups

- Coverage cron / GNews underCovered improves as `district_coverage_daily` fills and geo `primary_district` coverage rises
- Official sources for most districts remain probation/disabled until discovery verifies hosts
- Image deep audit results TBD (`IMAGE_DEEP_AUDIT.md`)
- `news_signals.geo_metadata` present in DB (migration 014) but generated Supabase TS types may lag — insert still sends the column
