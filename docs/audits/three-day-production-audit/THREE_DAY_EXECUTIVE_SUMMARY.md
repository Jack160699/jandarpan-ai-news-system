# Jan Darpan — Three-Day Production Audit (Executive Summary)

**Audit type:** Read-only forensic audit (no code, config, cron, queue, or data changes were made).
**Site:** https://www.jandarpan.news
**Repo:** Jack160699/jandarpan-ai-news-system (Vercel project `newspaper-motion`, `prj_kJbD8R5jMyugTUpK4V95ZqhMI0YZ`)
**Supabase project:** `giiuqshoconjbpiueasp` (ACTIVE_HEALTHY, ap-northeast-1, Postgres 17)
**Time zone:** Asia/Kolkata (IST). Internal timestamps UTC.
**"Now" anchor:** 2026-07-19 12:30:45 UTC = **2026-07-19 18:00:45 IST**
**Calendar window:** 2026-07-17 00:00 IST (2026-07-16 18:30 UTC) → now
**Rolling 72h window:** 2026-07-16 12:30 UTC → now

---

## Overall verdict

### 🟠 DEGRADED BUT OPERATING

The platform, the reader site, ingestion, AI enrichment, SEO automation and Search Console sync are all **up and working**. The "Critical / 28 / F" the admin showed is **primarily a health-classification error**, not a real outage. However, underneath that false alarm there is a **genuine, serious problem**: the newsroom ingests ~1,600 raw items/day but **publishes only 2–4 finished articles/day** because editorial generation and its upstream workers are starved. Publishing did **not** stop, but it is running at a small fraction of the ingested volume.

---

## The one-paragraph story

Ingestion is a firehose and it is working: over the three calendar days the pipeline pulled tens of thousands of provider items and inserted **~4,378 genuinely new news signals** (Jul 17–19), driven mainly by **NewsData** (~1,100/day), with **GNews** (~144/day, healthy) and **RSS** (~180–370/day) as smaller feeds. But two independent problems dominate the last three days: (1) The **`fetch-news` cron records `ok=false` / HTTP 500** on ~2 of every 3 runs — not because ingestion failed, but because a **run-guard rule treats any provider soft-error (e.g. a dead RSS feed) as a worker failure**, and the health monitor then hard-forces the whole platform to **Critical / 28 / F / "Cron failed: fetch-news."** (2) The **editorial-generation funnel is starved**: `editorial_generate` and the workers that feed it (`embed_signals`, `intelligence_snapshot`, `event_cluster`, etc.) run *inside* the `orchestrate` cron's ~110s budget and are killed by `job_timeout`, so only **10 articles were generated and ~10 published in three days** against 349 event-clusters and 4,534 enriched signals. Separately, **`translate_article` is 100% broken** by a code bug (`urgencyScore is not defined`), leaving translation coverage at ~6.6%.

---

## Three-day numbers (calendar Jul 17–19 IST)

| Metric | Value |
|---|---:|
| Raw provider items fetched (logged, incl. re-fetch) | ~71,164 |
| **Genuinely new signals inserted** | **4,378** |
| Duplicates / re-fetched (deduped via upsert, logged as 0) | ~66,786 (~94%) |
| Legacy raw articles inserted | 4,146 |
| Queued for AI enrichment | 4,534 |
| AI enrichment completed | 4,534 (100%, 0 pending/failed) |
| Event clusters created | 349 |
| **Generated articles** | **10** |
| **Published articles** | **~10** (9 by published_at Jul17–19 + 1 on Jul16 within rolling window) |
| Failed / stuck generation | 1 ("Untitled story", empty body) |
| Pending in generation queues | 18 editorial_generate (+ ~194 upstream jobs) |
| Dead-lettered | 2 (intelligence_snapshot, job_timeout) |
| Publication success (generated→published) | ~90% |
| Avg generation→publication time | ~121 min (median ~82 min; fastest 14 min, slowest 344 min) |

Rolling-72h figures are within ~1% of the calendar figures plus the Jul 16 12:30–18:30 UTC sliver (~423 extra signals, 1 extra published).

## Daily breakdown

| Stage | Jul 17 | Jul 18 | Jul 19 (to 18:00) |
|---|---:|---:|---:|
| New signals | 1,553 | 1,641 | 1,184 |
| Legacy articles | 1,506 | 1,512 | 1,128 |
| AI queued/completed | 1,553 | 1,796 | 1,185 |
| Event clusters | 137 | 154 | 58 |
| Generated | 4 | 2 | 4 |
| Published | 4 | 2 | 3 |
| fetch-news cron ok / total | 16/48 | 16/48 | 15/36 |

---

## What is genuinely broken vs. what only looks broken

**Genuinely broken (fix these):**
- **Editorial generation throughput** — 2–4 articles/day. Upstream workers die on `job_timeout` inside the orchestrate budget. (P1)
- **`translate_article` worker** — 100% failure, code bug `urgencyScore is not defined`; 51 pending, coverage ~6.6%. (P2)
- **`editorial_generate` produces "Untitled story" empty articles** (16 all-time, 1 in window). (P2)
- Worker backlog: ~194 pending jobs, oldest from Jul 17. (P2)

**Degraded but working:**
- 8 of 18 RSS sources dead/disabled (etv-cg, zee-mpcg, jagran-cg, dd-news, patrika-cg, pib-india, pib-hindi, livehindustan-cg). Auto-disabled; NewsData/GNews cover the gap. (P3)
- Statement timeouts (57014) on some admin/generated-pool queries on Jul 19 morning. (P2)
- GNews daily 403 quota (optional provider, resets 00:00 UTC, handled). (P4)

**False / exaggerated health reporting (not a real outage):**
- **"Critical / 28 / F / Cron failed: fetch-news"** — driven by `fetch-news` `ok=false`, which is itself caused by a dead RSS feed adding a soft-error. Ingestion actually inserted thousands of items during every one of those "failed" runs. (P1 to fix the classifier)

---

## GNews impact (explicit)

**The platform did NOT stop.** GNews is healthy (`health_score=100`, 0 consecutive failures, last success 2026-07-19 17:37 IST) and contributed ~144 new signals/day. It hits its **daily request limit (HTTP 403, "next reset tomorrow at 00:00 UTC")** later each day, but this is an **optional** provider and the circuit breaker handles it; **NewsData (~1,100/day) and RSS (~180–370/day) continued throughout.** GNews quota was **not** the cause of the "Critical" state — dead RSS feeds flipping the `fetch-news` cron `ok=false` were.

## SEO result (execution vs. impact)

- **Executed:** 53 SEO execution jobs completed; 10 SEO actions succeeded (9 skipped); 98 seo-intelligence + 11 seo-autonomous + 5 serp-tracker + 3 gsc-intelligence cron runs, all OK; 145 competitor crawls.
- **Indexing / sitemaps:** `/sitemap.xml` (HTTP 200, 963 URLs), `/news-sitemap.xml` (HTTP 200), `robots.txt` all healthy live. GSC index health recovered from `error` (Jul 12–16) to **healthy** (Jul 17–19); indexed pages grew 56 → **130**.
- **Search-engine impact:** **Unavailable / pending** for Jul 17–19 (Google 2–3 day reporting delay; last GSC data = Jul 16). Do **not** read execution success as ranking success. Traffic is tiny (brand query "jandarpan": 3 clicks; most district queries at position 20–39).

---

## Top root causes (in order)

1. **`run-guard` marks the whole `fetch-news` cron failed on any provider soft-error** (`ok = result.ok !== false && failed === 0`, where `failed = errors.length`), and **canonical-health hard-forces state=critical (→ 28/F) on any `cron.ok===false`.** → the false "Critical."
2. **Orchestrate deadline budget starves the generation workers** → publishing throughput collapse.
3. **`translate_article` code bug** → translation subsystem down.
4. **8 dead RSS sources** → both minor data loss and the trigger for cause #1.

## Fix priority

- **P1 (now):** (a) Stop treating provider soft-errors / partial-timeout inserts as `fetch-news` failure and stop hard-forcing Critical on a single soft cron fail; (b) unblock editorial generation throughput (dedicated worker lane or higher budget for generation).
- **P2 (next):** Fix `translate_article` (`urgencyScore`), drain the ~194-job backlog, fix "Untitled story" empty generation, investigate Jul-19 statement timeouts.
- **P3/P4 (later):** Repair/replace 8 dead RSS sources, GNews quota headroom, competitor-tracker 120s timeout, DYNAMIC_SERVER_USAGE render errors.

## No-data / blocked checks

- **Search Console Jul 17–19:** unavailable (reporting delay) — not zeroed.
- **Per-request p50/p95 route latency:** not directly available via read-only tools; approximated from Vercel runtime error clusters + cron durations.
- **Redis/Upstash:** code emits "UPSTASH_REDIS not configured in production" warning — overlap-lock protection may be memory-only (unverified from here).
- No secrets, tokens, or personal data are included in this audit.

## Reports & exports

See the sibling `.md` files and the `data/` CSVs listed in `DATA_SOURCES_AND_QUERIES.md`.
