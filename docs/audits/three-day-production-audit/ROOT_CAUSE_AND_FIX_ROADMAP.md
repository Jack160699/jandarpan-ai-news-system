# Root-Cause Analysis & Fix Roadmap

Format per problem: Symptom · Immediate cause · Root cause · Contributing factors · Impact · Why monitoring classified it that way · Fallback worked? · Content lost? · Manual action? · Recommended fix · Priority. **No code was changed in this audit.**

---

## RC-1 — "Critical / 28 / F / Cron failed: fetch-news" (false alarm)
- **Symptom:** Admin shows Critical, score 28/100, grade F, reason "Cron failed: fetch-news".
- **Immediate cause:** `ops_cron_runs` has `fetch-news` rows with `ok=false` (98 in window).
- **Root cause:** `run-guard.ts` line 77 `ok = result.ok !== false && failed === 0` with `failed = errors.length`; a single dead-RSS soft error makes `failed>0` ⇒ cron `ok=false`. Then `canonical-health.ts` `if (j.ok===false) state=critical` and `estimateScoreFromState("critical")=28/F`.
- **Contributing factors:** 8 dead RSS feeds constantly seed `errors[]`; score is derived from the state label, not the real weighted score (~80/B).
- **Impact:** Misleading ops signal; masks the real throughput problem. No data/user impact.
- **Why monitoring said so:** it equates any provider soft-error with worker failure, and any failed cron with platform-critical.
- **Fallback worked?** Yes — ingestion inserted articles on every "failed" run.
- **Content lost?** No.
- **Manual action required?** No (audit-only); fix is code.
- **Recommended fix:** base `fetch-news` `ok` on ingestion outcome (inserted/fetched>0), record soft errors as `degraded`; replace the blanket `ok===false→critical` rule with a criticality × consecutive-failure matrix; report `computeStabilityScore()` not the state-snapped 28.
- **Priority: P1** (misleading health during a real—but different—incident).

## RC-2 — Publication throughput collapse (2–4 articles/day)
- **Symptom:** 10 generated / ~10 published over 3 days vs 349 event clusters & 4,534 enriched signals.
- **Immediate cause:** `editorial_generate` and feeder workers (`embed_signals`, `event_cluster`, `intelligence_snapshot`) fail with `job_timeout`; 194-job backlog; `editorial_images` skipped.
- **Root cause:** all intelligence workers share the single `orchestrate` cron's **~110s budget**; heavy/late workers are starved/killed before finishing.
- **Contributing factors:** intelligence_snapshot (avg 20s/max 39s) and embed_signals (avg 15s) are budget-hungry; editorial_images runs last and is routinely skipped (orchestrate always `degraded`).
- **Impact:** **The core business failure** — the newsroom under-publishes massively; thin Google News sitemap; little for readers/SEO.
- **Why monitoring said so:** not surfaced at all — no publication-throughput health signal exists; the board reddened on RC-1 instead.
- **Fallback worked?** Partially — site still shows the historical 872 articles; only *new* output is throttled.
- **Content lost?** Not lost, but **not created** — clusters exist without articles.
- **Manual action required?** No destructive action; needs code/scheduling change + backlog drain.
- **Recommended fix:** give generation + embeddings + snapshot a dedicated cron lane or larger budget; parallelize/raise `maxDuration`; add a "published/hour" health metric.
- **Priority: P1.**

## RC-3 — Translation subsystem fully broken
- **Symptom:** `translate_article` 0/26 succeed; 51 pending; coverage ~6.6%.
- **Immediate cause:** every run throws `ReferenceError: urgencyScore is not defined`.
- **Root cause:** a code bug (undefined variable) in the translate_article handler path.
- **Contributing factors:** shipped/undetected since ~Jul 9 (last successful translate was Jul 9).
- **Impact:** 814/872 published articles untranslated; no Hindi↔English coverage for readers who switch language.
- **Why monitoring said so:** `translation-backfill` cron reports `ok` (it enqueues; the *worker* fails downstream), so alerts didn't fire.
- **Fallback worked?** No — no translation produced.
- **Content lost?** No (source articles intact); translations simply absent.
- **Manual action required?** Code fix, then the 51 pending will drain.
- **Recommended fix:** define/scope `urgencyScore` in the handler; add a worker-level failure alert distinct from the enqueue cron.
- **Priority: P2.**

## RC-4 — "Untitled story" empty generations
- **Symptom:** 16 all-time (1 in window) `generated_articles` with headline "Untitled story", 0-char body, stuck `pending/draft`.
- **Immediate/Root cause:** `editorial_generate` writes a record even when the generation step yields no headline/body (no guard rejecting empty output).
- **Impact:** duplicate-headline noise; a dangling draft; wasted a generation slot.
- **Fallback/Content:** no loss; but pollutes the pool and duplicate-headline metrics.
- **Recommended fix:** validate non-empty headline+body before persisting; discard/retry empties.
- **Priority: P2.**

## RC-5 — 8 dead RSS sources
- **Symptom:** etv-cg, zee-mpcg, jagran-cg, dd-news, patrika-cg (72–76 consecutive fails), pib-india, pib-hindi, livehindustan-cg (10) auto-disabled.
- **Root cause:** upstream feed endpoints failing (parse/unavailable); circuit breaker disables for ~12h then retries.
- **Impact:** reduced source diversity; **and** these soft-errors are the trigger for RC-1's false critical.
- **Fallback worked?** Yes — NewsData + GNews + healthy RSS cover volume.
- **Content lost?** Marginal (those specific outlets' items).
- **Recommended fix:** repair/replace feed URLs; permanently retire truly dead ones; stop counting optional-source failures toward cron `ok` (see RC-1).
- **Priority: P3.**

## RC-6 — DB statement timeouts (generated-pool) & competitor 120s timeout
- **Symptom:** `57014` statement timeout (up to 11.2s) on admin health/status + generated-pool; competitor-tracker hits 120s.
- **Root cause:** slow generated-article pool query shape under load / large scan; competitor crawl exceeds function budget.
- **Impact:** intermittent admin dashboard errors Jul 19 morning; occasional competitor run truncation.
- **Recommended fix:** optimize/​index the generated-pool query; raise or chunk competitor-tracker.
- **Priority: P2 (timeouts) / P3 (competitor).**

## RC-7 — Ingestion metrics inflated / dedup invisible
- **Symptom:** `ingestion_logs.inserted` ~71k vs 4.4k real new signals; `skipped_duplicates=0`.
- **Root cause:** counts per-provider ingest attempts; dedup via upsert isn't recorded as skipped.
- **Impact:** dashboards overstate ingestion; obscures true new-content rate.
- **Recommended fix:** log net-new vs upsert-overwrite separately.
- **Priority: P4.**

## RC-8 — Jobs missing tenant_id, GNews daily quota, DYNAMIC_SERVER_USAGE renders, Redis warning
- Widespread `tenant_id=null` on jobs (works single-tenant; hygiene). **P4.**
- GNews daily 403 quota — optional, handled; add headroom/upgrade if GNews volume matters. **P4.**
- `DYNAMIC_SERVER_USAGE` render errors on `/topics /districts /live` — add proper dynamic config. **P3.**
- "UPSTASH_REDIS not configured in production" warning — overlap-lock may be memory-only; verify Redis. **P3.**

---

## Fix priority roadmap

| Priority | Items |
|---|---|
| **P0** | *(none — no security/data-loss/full-outage found in window)* |
| **P1** | RC-1 (health classifier + fetch-news ok rule); RC-2 (unblock editorial generation throughput) |
| **P2** | RC-3 (translate_article bug + drain 51); RC-4 (empty "Untitled" generations); RC-6 (statement timeouts) |
| **P3** | RC-5 (dead RSS repair/retire); RC-6 (competitor 120s); RC-8 (DYNAMIC_SERVER_USAGE, verify Redis) |
| **P4** | RC-7 (ingestion metric accuracy); tenant_id hygiene; GNews quota headroom |

**Fix first:** RC-1 and RC-2 together — RC-1 to make the health board tell the truth, RC-2 because it is the real damage (the newsroom is barely publishing).
