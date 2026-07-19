# Phase 1 — Canonical Health Rules & Weighted Scoring

## Overall states

`healthy · warning · degraded · critical · unknown` (unchanged set), derived in
`src/lib/admin-v3/canonical-health.ts`.

## Cron criticality matrix (replaces "any failed cron ⇒ critical")

The blanket rule `if (j.ok === false) state = critical` is replaced by a
criticality × outcome matrix:

| Cron job | Criticality | Last run failed (`ok=false`) | Last run degraded (`ok=true, degraded=true`) |
|---|---|---|---|
| `orchestrate`, `edition-publish` | core | **critical** | degraded |
| `fetch-news` | ingestion | **degraded** | degraded |
| everything else | optional | degraded | degraded |

So a single ingestion/optional cron hard-failure is **degraded**, not
platform-Critical. Only a core publishing cron hard-failure escalates to
Critical. Combined with the new `fetch-news` semantics (which now records
`ok=true, degraded=true` for a degraded run), the historical false-critical no
longer occurs.

### Rules honoured

- Optional provider quota exhaustion → cannot independently force Critical.
- Degraded ingestion with successful persistence → cannot force Critical.
- Dead/retired RSS feeds → cannot force Critical (not a family failure).
- Database persistence failure → ingestion `failed` → core signal → Critical.
- Complete source-family outage → ingestion `failed`.
- Translation failure is scored on the `translation` subsystem only and does not
  drag the whole platform to Critical while Hindi publishing continues.
- Publishing/generation blockage is scored on `publishing`/`editorial` and can
  reach Critical when those cores are down.

## Deterministic weighted score

`src/lib/admin-v3/health-scoring.ts` → `computeCanonicalScore(states)`.

The all-or-nothing `estimateScoreFromState` (which snapped Critical → fixed
28/F) is removed. Score is now a weighted sum over subsystem states.

### Subsystem weights (sum = 1.00)

| Subsystem | Weight |
|---|---:|
| website | 0.16 |
| database | 0.16 |
| publishing | 0.14 |
| editorial | 0.12 |
| ingestion | 0.12 |
| ai | 0.08 |
| translation | 0.06 |
| external (optional providers) | 0.06 |
| images | 0.05 |
| seo | 0.05 |

### Per-state subsystem score

`healthy=100 · unknown=80 · warning=75 · degraded=55 · critical=15`

### Grade thresholds

`A ≥ 90 · B ≥ 80 · C ≥ 70 · D ≥ 55 · F otherwise`

Subsystems with no active incident default to `healthy`. Incidents are mapped to
subsystems by incident family / id / text. A real stability score from heavy
diagnostics (`computeStabilityScore`) is still preferred when provided; the
weighted model is the deterministic fallback used by the fast summary surface
(header/bell/login) that previously produced 28/F.

### Effect on the historical incident

For the audited incident (degraded ingestion + optional GNews quota + low
publishing), the weighted model yields a score in the **~80s / grade B** range
rather than 28/F. The exact value is computed from subsystem states — **not
hardcoded** to any target.

## Files changed

- `src/lib/admin-v3/canonical-health.ts` — criticality matrix, incident
  language, subsystem derivation, weighted score wiring.
- `src/lib/admin-v3/health-scoring.ts` — new weighted model.
