# Final Report — Autonomous District Editorial Engine

**Status: STAGE 1 IN PROGRESS / SHADOW DEFAULT**

Branch: `feat/autonomous-district-stage1-integration`  
Prior foundation: `feat/autonomous-district-editorial-engine` @ `8095bd0` merge base  
Live prod reference: keep shadow until explicit env + DB activation.

## Delivered (foundation + stage 1 wiring)

1. 33-district registry with tiers/targets (sum 138) + helpers + unit tests
2. `src/lib/autonomous/*` foundation (rollout, coverage, GNews plan, evidence, quality, pacing)
3. Image canonical resolver + URL validation + quality score (fallbacks preserved)
4. Shadow-safe cron `/api/cron/district-coverage` @ `:20` hourly — now IST-day real counts + upsert
5. Migration `066_autonomous_district_engine.sql`
6. `/how-we-report` methodology page
7. Capacity stage targets via `getEffectiveDailyLimit()` (shadow 40; **stage_1 → 60**)
8. Audit docs in this folder
9. SEO `janDarpanNewsDeskAuthor()` helper
10. **Stage 1 functional integration** — see `STAGE1_INTEGRATION.md`:
    - District classifier (no Raipur force for state-govt-only)
    - Signal `geo_metadata` column write
    - District repair helpers
    - Official sources minimum registry
    - GNews gap-first (shadow sample 2 / stage_1 full)
    - Human quality thresholds 82/70/90 + evidence number scan in generate-article
    - Image display adapter cutover + stale job repair
    - `activateStage1(reason)` + stage_1 soft hourly pacing (4/hour)

## Not delivered yet (gated)

- Production `AUTONOMOUS_ROLLOUT_STAGE=stage_1` env flip
- Full verified official URLs for all 33 districts (discovery later)
- Image deep audit quantitative results (`IMAGE_DEEP_AUDIT.md` placeholder)
- Autonomous publish volume increase while env remains shadow

## Baseline reminder

signals_7d 8264 → gen 116 → published 40 (all with hero; district geo unknown for all 40).  
Step 5 aborted by product decision `2026-07-20T20:32:25Z`.

## Confirmation

**Production default remains SHADOW** (`AUTONOMOUS_ROLLOUT_STAGE` unset → shadow → `isAutonomousPublishingEnabled() === false`).

Activate stage_1 only via guarded path documented in `STAGE1_INTEGRATION.md`.
