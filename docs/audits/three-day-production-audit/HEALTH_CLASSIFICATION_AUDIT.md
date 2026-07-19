# Health-Classification Audit

## The reported state
Admin displayed: **Critical · Score 28/100 · Grade F · "Cron failed: fetch-news"**.

## Why — traced to code

### Step 1 — `fetch-news` records `ok=false` on soft errors
`src/app/api/fetch-news/route.ts` wraps ingestion in `runWorkerEndpoint("fetch-news", 1700, fn)` and passes `failed: result.errors.length`.

`src/lib/infrastructure/workers/run-guard.ts` (line 77):
```ts
const ok = result.ok !== false && failed === 0;
```
`runScalableIngestion` returns `ok: inserted > 0 || totalFetched > 0` (almost always true) **but also returns `errors[]`** containing per-provider soft errors (e.g. a dead RSS feed → `"rss: <source> failed"`). So `failed = errors.length > 0` ⇒ **`ok=false`**, and the route (lines 149–161) records:
```ts
recordCronRun({ job: "fetch-news", ok: false, error: "ingest_worker_failed" }); // HTTP 500
```
even though thousands of articles were just inserted (`ingestion_logs.status = partial_timeout`, `inserted > 0`). Evidence: 98 in-window `fetch-news` runs with `ok=false, error='ingest_worker_failed'`, every one accompanied by an `ingestion_logs` row with `inserted > 0`.

### Step 2 — canonical-health hard-forces Critical on any failed cron
`src/lib/admin-v3/canonical-health.ts` (lines ~320–333):
```ts
for (const raw of jobs.slice(0, 12)) {
  const j = asRecord(raw);
  if (j.ok === false) {
    state = worse(state, "critical");
    reasons.push({ severity: "critical", title: `Cron failed: ${String(j.job)}`, ... });
  }
}
```
Any single `cron.ok === false` (here, `fetch-news`) ⇒ `state = "critical"`.

### Step 3 — the score is derived from the state, not computed
`estimateScoreFromState()` (lines ~98–114):
```ts
case "critical": return { score: 28, grade: "F" };
```
So **28/F is a fixed label for the "critical" state**, NOT the weighted stability score.

## The real weighted score (what it *should* have been)
`computeStabilityScore()` (`src/lib/observability/stability-score.ts`) weights: core platform 0.35, prod-env 0.15, error-rate 0.15, cron-freshness 0.15, api-latency 0.10, observability 0.10 (per-check: healthy=100, degraded=60, unknown=40, unhealthy=0).

Component-by-component estimate for the incident (from measured data):

| Component | Weight | Observed | Score |
|---|---:|---|---:|
| Core platform (supabase↑, ingestion inserting, homepage 200, queues backlogged, workers running) | 0.35 | mostly healthy, queues degraded | ~84 → **29.4** |
| Production env readiness | 0.15 | configured | ~100 → **15.0** |
| Error rate (24h) | 0.15 | statement timeouts + GNews 403 present | ~60 → **9.0** |
| Cron freshness (recency) | 0.15 | all crons ran on schedule | ~100 → **15.0** |
| API latency & errors | 0.10 | some slow routes / timeouts | ~60 → **6.0** |
| Observability (Redis/Sentry) | 0.10 | Redis warning in prod | ~60 → **6.0** |
| **Weighted total** | | | **≈ 80 / Grade B** |

So the honest score is **≈ 80 (B, "Healthy with warnings")**, but the **cron-fail override collapses it to 28/F**. The gap (80 → 28) is the classification error.

## The exact rule that let an optional failure dominate
Two rules combine:
1. **run-guard:** `ok = result.ok !== false && failed === 0` where `failed = errors.length` — conflates *provider soft-errors* with *worker failure*.
2. **canonical-health:** `if (j.ok === false) state = worse(state, "critical")` — treats **any** cron `ok=false` as **critical**, with no consideration of whether the cron did useful work, whether the failing input was an *optional* provider, or how many consecutive real failures occurred.

A single dead RSS feed (optional) therefore cascades: soft error → cron `ok=false` → state=critical → 28/F. (GNews quota is separately deduped as `provider-quota:gnews` and does not itself force critical, but any dead RSS does.)

## True operational state — recalculated, dimension by dimension

| Dimension | True state | Basis |
|---|---|---|
| Platform availability | **Healthy** | homepage/story/sitemap/robots all HTTP 200 |
| Scheduler health | **Healthy** | every cron executed on schedule, 1:1 heartbeats |
| Ingestion-provider health | **Degraded** | NewsData/GNews healthy; 8/18 RSS dead |
| Publication output | **Critical (business)** | 2–4 articles/day vs ~1,600 signals/day |
| Database health | **Warning** | resolved egress outage; localized statement timeouts Jul 19 |
| AI-provider health | **Healthy** | 16,566 OpenAI calls, 0 errors; AI queue 100% drained |
| SEO health | **Healthy (execution)** | crons ok, GSC syncing, index health recovered |
| Optional-provider status | **Warning** | GNews daily quota (handled) |

**Correct overall classification: `Degraded but operating` (Warning-to-Degraded), NOT `Critical`.** The infra/availability is Warning; the *only* Critical-worthy dimension is **publication throughput** — and that is a real problem the current classifier does **not** surface (it fixates on the cron `ok` flag instead).

## Recommended classification logic (specification only — not applied)

1. **Do not equate provider soft-errors with cron failure.** In `run-guard`/`fetch-news`, base cron `ok` on *ingestion outcome* (`inserted > 0` OR `totalFetched > 0`), and record soft provider errors as `degraded=true`, not `ok=false`.
2. **`fetch-news` severity ladder:**
   - inserted > 0 (even partial_timeout) → **healthy/degraded**;
   - inserted = 0 but providers reachable → **warning**;
   - 0 inserts for N consecutive runs (e.g. ≥3, ~90 min) → **critical**.
3. **canonical-health:** replace `if (j.ok===false) → critical` with a job-criticality × consecutive-failure matrix; a single soft cron miss = **warning**, sustained core-cron hard failure = **critical**.
4. **Separate the score from the label:** report the real `computeStabilityScore()` (≈80/B here) and attach discrete incident chips (e.g. "ingestion degraded: 8 RSS sources down", "publication throughput low"), rather than snapping to 28/F.
5. **Add a publication-throughput health signal** (articles published per hour vs. a floor) so the *genuine* problem is what turns the board red — not a dead RSS feed.

The Jul-19 commit `2c23c68` ("unify canonical production status, stop false cron/sitemap/translation alerts") attempted to address false alerts, but because `fetch-news` still writes `ok=false` to `ops_cron_runs` (21 such rows on Jul 19), the underlying trigger remains and the classifier can still escalate to Critical.
