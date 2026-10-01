# Editorial generation on Supabase Edge Functions — design (Part 2, no code deployed)

**Goal:** the production news pipeline must not depend on Vercel Pro. Vercel Hobby serves the website; Supabase Free
(pg_cron + pg_net + Edge Functions) runs the workers. ₹0 additional platform cost.

**Status (2026-09-30):** the worker is IMPLEMENTED and verified locally under a real Deno runtime (see §7). Nothing is deployed, no secrets or Vault entries were created, no Vercel/Supabase setting was changed, and migration 089 is still unapplied.

## 1. Why the current worker paths cannot stay on Vercel Hobby

Vercel Hobby includes (fair-use page, checked 2026-09-30): **4 h Active CPU, 360 GB-hr Provisioned Memory, 1 M invocations** per month.
Provisioned memory is billed for the *wall-clock* time a function instance is alive — including the seconds it spends waiting on
an LLM or an RSS host. Measured durations (`ops_cron_runs`, last 30 days, pre-hardening) at the post-089 cadence:

| Route (scheduler job) | runs/day | avg | p90 | wall h/day |
|---|---|---|---|---|
| `/api/fetch-news` | 144 | 99 s | 231 s | 3.96 |
| `/api/cron/editorial-generate` | 144 | 78 s | 218 s | 3.12 |
| `/api/cron/cluster` | 144 | 29 s | 37 s | 1.16 |
| `/api/cron/orchestrate` | 96 | 17 s | 44 s | 0.44 |
| `/api/cron/jobs` (worker queue) | 48 | 26 s | 55 s | 0.34 |
| `/api/cron/translation-backfill` | 48 | ~26 s (assumed = jobs) | – | 0.35 |
| edition-publish, snapshots, rates, report | ~90 | 1–5 s | – | ~0.05 |
| **Total** | | | | **≈ 9.4 h/day ≈ 283 h/month** |

At Vercel's default 2 GB Hobby function memory that is ≈ 566 GB-hr against 360 included (≈ 283 GB-hr even at 1 GB, before any web traffic).
Active CPU (480 CPU-seconds/day budget) is also at risk: ~650 scheduled invocations/day × a few seconds of parsing/validation each.
These are estimates from historical durations, not a Vercel usage export — confirm against the Vercel Usage tab before deciding the phase-2 scope.
Hobby has no pay-as-you-go: the practical outcome of exceeding it is throttling/pausing of the site, which is why the *workers* must leave Vercel.

Also note (not a technical blocker, a policy one): Vercel's Hobby plan is restricted to non-commercial use. If the site carries ads or other
monetisation (there is a `/api/monetization` surface) that needs a decision independent of this design.

## 2. Vercel-dependent worker paths, and where each should live

| Path | What it does | Vercel-only coupling | Verdict |
|---|---|---|---|
| Website (SSR/ISR pages, `/api/*` read routes, admin UI) | serves readers | Next.js runtime | **Stay on Vercel** |
| `/api/cron/orchestrate` | image queue (uses `sharp`), snapshots, analytics, **`revalidateTag`/ISR refresh** | `sharp`, `next/cache` | **Stay** (0.44 h/day) |
| `/api/cron/jobs` (`worker_jobs` drain) | mixed handlers incl. image generation | `sharp` in some handlers | **Stay**; translation handlers can be split out later |
| `/api/cron/edition-publish` | scheduled publish slot (1 s) | ISR revalidation | **Stay** |
| district-coverage / provider-quota-snapshot / verified-rates / daily report | tiny snapshots | none real | **Stay** (≈0.05 h/day); could become SQL later |
| `/api/admin/*`, `/api/admin/ops/run` | control center | Next auth/cookies | **Stay** |
| **`/api/cron/editorial-generate`** | AI generation → gates → publish | only `after()` (4 provider files) + barrel import of `next/headers`; **no** `sharp` executed, **no** revalidate | **MOVE → Edge (P0)** |
| `/api/fetch-news` | RSS/NewsData/GNews ingestion (3.96 h/day) | none real (network + XML parse) | **MOVE → Edge (P1), sharded** |
| `/api/cron/cluster` | signals→events, Cloudflare embeddings (1.16 h/day) | none real | **MOVE → Edge (P1)** |
| translation handlers (`translate_article`) | Gemini/Groq translation | none real | **MOVE → Edge (P2)** if still needed |

After P0+P1 the remaining Vercel scheduled load is ≈ 1.1 h/day (~33 h/month → ≈ 66 GB-hr) and ~300 invocations/day: comfortably inside Hobby.
P0 alone (≈ 3.1 h/day) does **not** get the workers under the memory allotment — P1 is required for the target.

## 3. Feasibility evidence (reproducible)

`node scripts/edge-bundle-check.mjs src/lib/news/ai/generate-article.ts` bundles the *real* generation module with `next/*`, `sharp`, `server-only` stubbed:

* 233 source files → **518 KB** bundle (limit: 20 MB locally-bundled / 5 MB server-side). The whole lane (`editorial-generate-lane.ts`) is 520 KB.
* Remaining runtime imports: `node:async_hooks` (per-run LLM budget), `node:crypto`, and one bare `crypto` (alias to `node:crypto` in the build).
* npm packages inside: `@supabase/supabase-js` (+ ssr/cookie, unused at runtime) — no native modules.
* `sharp` is imported statically (image quality/compress) but **never executed** on the generation path: generation only calls `queueEditorialImageForArticle` (publication is image-independent), so a throwing stub is safe.
* No `revalidateTag`/`revalidatePath` on the path — the 15-minute orchestrate run (Vercel) refreshes caches, so publishing from Edge needs no Vercel callback.
* Env read by the closure: 124 variables (51 app, 60 AI/editorial, Supabase, Upstash). Only ~25 are required for the one-item worker (§4.5).

**Not verified here** (no Deno/Docker in this environment, and deploying is out of scope): behaviour under the real Edge runtime — global `process`/`Buffer`,
`AsyncLocalStorage`, and measured CPU time. See blockers.

## 4. The smallest Edge worker

### 4.1 Shape

One function, `supabase/functions/editorial-worker`, **one queue item per invocation**. "Queue item" = the top-ranked eligible `news_events` candidate
(the same ranking, geo/quality/dedupe/publication gates and `editorial_candidate_attempts` backoff the Vercel lane uses). No new pipeline: the function calls the
existing `generateEditorialsFromEvents({ limit: 1 })` inside `withLlmCallBudget`.

```
pg_cron ──(SQL: kill switch ∧ jd_editorial_work_available() ∧ lease free)──▶ pg_net POST /functions/v1/editorial-worker
                                                                                 │  Authorization: Bearer <vault jd_edge_worker_secret>
Edge function (Deno, ≤150 s wall, ≤2 s CPU)                                      ▼
  1. verify bearer, kill switch, acquire lease "editorial-generate"   (same key as the Vercel route ⇒ mutual exclusion, easy rollback)
  2. respond 202 immediately; continue in EdgeRuntime.waitUntil(...)   (request idle timeout is 150 s)
  3. generateEditorialsFromEvents({ limit: 1 })   with  EDITORIAL_MAX_LLM_CALLS_PER_RUN=2, EDITORIAL_MAX_CANDIDATE_ATTEMPTS=3
        → ranks, claims the candidate, calls CodeCraft→Gemini→Groq chain, applies every existing gate, persists, queues image
        → failures land in editorial_candidate_attempts (15/30/60/120 min backoff, dead-letter at 4)
  4. await pending "after()" tasks (usage/health persistence), write ops_cron_runs row, release lease
```

### 4.2 Files (to be created only after approval)

| File | Size | Purpose |
|---|---|---|
| `supabase/functions/editorial-worker/entry.ts` | ~80 lines | auth, kill switch, lease, `waitUntil`, env mapping (`SUPABASE_URL`→`NEXT_PUBLIC_SUPABASE_URL`, `VERCEL_ENV=production`), calls the module |
| `supabase/functions/_shims/{next-server,next-headers,sharp,server-only}.ts` | ~10 lines each | `after()` collects promises; the others throw if executed |
| `scripts/build-edge-worker.mjs` | ~60 lines | promotes `edge-bundle-check.mjs` to a real esbuild step → `supabase/functions/editorial-worker/index.js` |
| `supabase/migrations/…_090_edge_dispatch.sql` | ~60 lines | `jd_invoke_edge(fn, lease_key, timeout)` (base URL + secret from Vault: `jd_edge_base_url`, `jd_edge_worker_secret`), `jd_editorial_work_available()`; re-points `jd-editorial-generate` |
| `src/lib/ai/providers/after.ts` (tiny refactor) | ~15 lines | replaces 4 direct `next/server` imports so the shim is not needed |

Nothing in the editorial logic is rewritten. Already done in this hardening pass because the Edge worker depends on it: per-run LLM budget, `EDITORIAL_MAX_CANDIDATE_ATTEMPTS`, candidate backoff/dead-letter, the kill switch and lease pre-check.

### 4.3 Time and CPU budget for one item

* Wall (Free 150 s): candidate prep (DB reads, one embedding call) ≈ 2–4 s + one writer call (CodeCraft capped at 55 s via `AI_PROVIDER_TIMEOUT_CAP_MS_CODECRAFT`) + at most one repair call = ≈ 120 s worst case. Worker skips the repair call when > 70 s have elapsed; the attempt is then recorded and the event retried later by backoff.
* CPU (2 s, excludes I/O wait): parsing/validation/fingerprinting/dedupe for one article. **Unmeasured** — the top item to measure in a dry-run deploy.

### 4.4 Cutover (each step needs explicit approval)

1. Deploy `editorial-worker` in `dry_run` mode (does everything except persist) — measure CPU/wall/heap on real candidates.
2. Provide Edge secrets (§4.5) and Vault `jd_edge_*`.
3. Point `jd-editorial-generate` at the Edge function; keep the Vercel route (same lease key) as instant rollback: `select public.jd_set_scheduler_enabled(false)` or re-register the old job.
4. P1: shard `fetch-news` (per-source-group) and move `cluster` the same way.

### 4.5 New environment variables

**Already introduced by this hardening commit (app / Vercel side, all optional with safe defaults):**

| Variable | Default | Meaning |
|---|---|---|
| `EDITORIAL_MAX_LLM_CALLS_PER_RUN` | `12` | hard cap on real provider calls per editorial run |
| `EDITORIAL_MAX_CANDIDATE_ATTEMPTS` | `max(limit×2, 8)` | events one batch may attempt (Edge worker: `3`) |
| `EDITORIAL_TARGET_PUBLISHED` | `4` (was 12) | stories per run in the Vercel lane |
| `EDITORIAL_DEPTH_MAX_RETRIES` | `0` (was 1) | paid depth retries (0–4) |
| `CODECRAFT_OPERATIONS` | `editorial_generate,editorial_repair` | operations allowed to use CodeCraft |
| `AI_QUOTA_CODECRAFT_[<MODEL>_]{RPM,TPM,RPD,TPD}_LIMIT` | 6 / 30 000 / 300 / 400 000 | raise CodeCraft safety limits explicitly |
| `AUDIO_GENERATION_ENABLED` | unset = **off** | audio needs this *and* Google credentials |

**Needed only for the Edge worker (not created):**
Supabase-provided automatically: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`. Edge secrets to set: `CODECRAFT_API_KEY`, `CODECRAFT_BASE_URL`,
`CODECRAFT_EDITORIAL_MODEL`, `CODECRAFT_REPAIR_MODEL`, `GEMINI_API_KEY`, `GEMINI_EDITORIAL_MODEL`, `GROQ_API_KEY`, `GROQ_WRITER_MODEL`, `GROQ_REVIEW_MODEL`,
`CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_EMBEDDING_MODEL`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` (shared quota state with Vercel),
`CROSS_LANG_DEDUPE_MODE`, `NEWSROOM_EDITORIAL_LANGUAGE`, `AI_CIRCUIT_PERSIST=true`, plus the caps above and `EDGE_WORKER_SECRET`. Vault: `jd_edge_base_url`, `jd_edge_worker_secret`.
Copying values out of Vercel is itself a sensitive operation — it is listed here, not done.

## 5. Estimated monthly Edge Function invocations at 100 published articles/day

Free plan: **500 000 invocations/month**, no duration charge listed. One invocation = one item; pg_cron skips the call when
`jd_editorial_work_available()` is false, so idle ticks cost nothing.

| Scenario | Per day | Per month |
|---|---|---|
| Editorial worker, 50 % of attempts publish (100 ÷ 0.5) | 200 | **6 000** |
| Editorial worker, 30 % yield (pessimistic; includes backoff retries) | 333 | 10 000 |
| + `cluster` on Edge (every 10 min) | 144 | 4 320 |
| + `fetch-news` on Edge, unsharded / 5 shards | 144 / 720 | 4 320 / 21 600 |
| + translation on Edge (batches of 5) | 40–200 | 1 200–6 000 |
| **P0 only** | ~200–333 | **6 000–10 000 (≈2 %)** |
| **P0 + P1 + P2 (5-shard ingestion)** | ~1 100–1 400 | **≈ 38 000–42 000 (≈ 8 %)** |

## 6. Blockers and open risks (none is a hard stop, three need measurement/approval)

1. **Edge CPU limit (2 s) is unmeasured for the generation path.** Mitigation: dry-run deploy first; if it exceeds, split validation into a second invocation or trim the heaviest gate for the Edge lane. Needs deploy approval.
2. **Wall clock (150 s Free)** vs slow CodeCraft calls (deepseek-pro previously took ~87 s). Fits with one writer call + one bounded repair; a writer call slower than ~70 s will consume most of the run. Mitigated by the budget and timeout caps above; may need a faster default model on Edge.
3. **Runtime parity unverified:** `AsyncLocalStorage`, global `process`/`Buffer` under Supabase's Deno runtime (expected to work via Deno 2 Node compat). Only testable by running it.
4. **Secrets duplication:** ~25 API keys must exist as Edge secrets. Requires approval to read them from Vercel and to run `supabase secrets set`.
5. **Ingestion (P1)** is CPU-bound XML parsing over ~100+ feeds; almost certainly needs sharding to stay under 2 s CPU / 150 s wall. Not needed for P0.
6. **Hobby is non-commercial-only** (policy, unrelated to Edge) — decide separately if the site is monetised.
7. `VERCEL_ENV`-gated behaviour (`isProductionDeployment()`) must be set explicitly in the Edge env or refactored to a neutral flag.

Not blockers: `sharp` (stubbed, never executed), `next/headers` (only reachable from cookie-auth helpers), revalidation (stays with orchestrate), bundle size (0.5 MB).

## 7. Implementation and verification (2026-09-30)

### 7.1 What exists

| Piece | Path |
|---|---|
| Entry (Deno) | `src/edge/editorial-worker/serve.ts` + `bootstrap-env.ts` (env parity, imported first) |
| Handler (runtime-agnostic) | `src/lib/edge/editorial-worker/{handler,auth,classify,logging,resources,deps}.ts` |
| Runtime ports (no stubs) | `src/lib/runtime/background.ts` (Next `after()`) / `background.edge.ts` (drain); `supabase.edge.ts` (service-role/env subset of the Supabase barrel) |
| Sharp-free image API | `src/lib/news/ai/editorial-image-enqueue.ts` (generate-editorial-image.ts re-exports it) |
| Per-run telemetry | `src/lib/ai/providers/run-telemetry.ts` (provider/model/tokens/latency/error code per call) |
| Generation options | `generateEditorialsFromEvents({ limit, eventId, dryRun, skipUpdates, stopAfterLlmCall, ignoreBackoff, maxAttempts })` |
| Function shell | `supabase/functions/editorial-worker/index.ts` (imports the git-ignored `worker.bundle.js`), `config.toml` `[functions.editorial-worker] verify_jwt = false` |
| Build / audit / tests | `pnpm edge:check`, `pnpm edge:build`, `scripts/edge-deno-smoke.mjs`, `scripts/edge-one-story-test.mjs` |

Behaviour: one candidate per invocation; fail-CLOSED lease on the same `editorial-generate` key as the Vercel lane (`acquireWorkerRunLease(..., { failOpen: false })`);
run mode refuses to spend AI budget unless Redis-backed quota storage is configured (in-memory counters reset every isolate, so CodeCraft RPM/TPM/RPD/TPD would not be enforced);
`EDGE_WORKER_MAX_LLM_CALLS` (default 2) caps provider calls; `EDGE_WORKER_DEADLINE_MS` (default 135 s) returns `deadline_exceeded` and deliberately keeps the lease until its TTL;
401/403/404 are non-retryable for every adapter, 429 honours `Retry-After` (inline wait only if <= 8 s, otherwise fail over; circuit floor = Retry-After), retries are jittered (>= 0.75x base),
and a failed candidate is backed off (15/30/60/120 min, dead-letter at 4) by `editorial_candidate_attempts` (migration 089) so it is never retried immediately.

### 7.2 Compatibility audit (strict, no stubs)

`node scripts/edge-bundle-check.mjs` fails the build if anything Edge cannot run is reachable. Original findings, each fixed at the source rather than stubbed:
`next/headers` (via the Supabase barrel: explicit Edge port), `next/server after()` (runtime port used by 4 provider files), bare `crypto` (5 files -> `node:crypto`),
`Buffer` global (explicit `node:buffer` import), `sharp` (pulled in by the AI-cost dashboard via generate-editorial-image; split into a sharp-free module and the dashboard now imports the queue module).
Result: 195 modules, 0.53 MB bundle, only `node:async_hooks` (per-run budget/telemetry `AsyncLocalStorage`), `node:crypto`, `node:buffer` remain; no filesystem access; no unsupported dynamic imports (18 literal ones, all bundled).
Real Deno 2.9.6 executes the bundle: boot, `process.env` bridging, `AsyncLocalStorage`, auth, validation and test-mode gating all pass (`scripts/edge-deno-smoke.mjs`, 8/8).

### 7.3 One-story test (real Deno, real Supabase data, real Gemini, dry run)

20/20 checks (`scripts/edge-one-story-test.mjs`): lease held elsewhere -> `overlap_lock` with zero provider calls; one selected event processed; AI answered (gemini-3.5-flash-lite after gemini-3.6-flash daily quota fallback);
publication gates ran; budget respected; nothing persisted; lease released; no secrets in logs; provider fault injection (local mock, Redis/circuit persistence off): 401 and 404 -> exactly 1 request and classified
`provider_auth` / `provider_invalid_request`; 429 (`Retry-After: 30`) -> 1 request, `provider_quota_exhausted`; 503 -> 2 requests 758-865 ms apart (jittered backoff), `provider_upstream`.

| Measure (local Deno 2.9.6, Windows) | Run 1 | Run 2 | Supabase Free limit |
|---|---|---|---|
| Request wall time | 16.3 s | 6.5 s | 150 s wall / 150 s idle timeout |
| Provider latency (sum) | 11.2 s | 3.1 s | - |
| CPU (process.cpuUsage, worker-reported) | 250 ms | 219 ms | 2 s per request (I/O wait excluded) - **UNVERIFIED on Supabase's meter** |
| CPU (whole process delta incl. TLS/boot) | 328 ms | 297 ms | same |
| Peak RSS | 78.6 MB | 84.0 MB | 256 MB |
| Provider calls | 3 (1 embedding + 2 Gemini) | 3 | - |
| Tokens (writer call) | 2 933 in / 260 out | 2 933 in / 285 out | - |
| Bundle | 0.53 MB | | 20 MB |

CodeCraft itself was not exercised against the real service (its key is not available locally); its adapter was exercised against the mock for 401/404/429/503.

### 7.4 Findings from the test

* A run inherently writes operational telemetry (`worker_run_leases` test key, `ai_provider_usage_events` +3/run). No article, run record or candidate-attempt row was written.
* **Publication-gate hole found and fixed:** e-paper page listings ("30092026 Raipur Main - 30 Sep 2026 - Page 10 - epaper.haribhoomi.com", urgency 90) ranked first, cost two paid calls, and one draft
  ("Raipur News Updates: Comprehensive Coverage for September 30, 2026") passed the gates. Now rejected before any LLM call (`isEpaperPageListingTitle`) and the roundup patterns cover month-first dates and "comprehensive coverage" filler. 12 such events existed in 7 days; 1 generic-like article was already published.
* The same event was gated in run 1 and allowed in run 2: gate outcomes depend on the (non-deterministic) draft.

## 8. Real Supabase Edge runtime validation (2026-09-30)

Migration 089 was applied to production first (kill switch `enabled=false`, prune off, scheduler inert: 0 dispatch rows, empty pg_net queue, no Vault secrets, 0 failed cron runs), then the function was deployed
(`supabase functions deploy editorial-worker --no-verify-jwt --use-api`, server-side bundling, no Docker) and validated with `scripts/edge-remote-validate.mjs` using TEMPORARY secrets that are unset in a `finally` block.

Hosted runtime: `supabase-edge-runtime-1.76.0 (compatible with Deno v2.1.4)`, region `ap-south-1`. Validation found two incompatibilities that local Deno 2.9.6 did NOT show:

| # | Hosted-runtime behaviour | Fix |
|---|---|---|
| 1 | `process.env` is **read-only** (`NotSupported` on assignment); the bundle crashed at boot with an opaque `WORKER_ERROR` | `bootstrap-env.ts` installs an overlay `process` (plain `env` object seeded from `Deno.env`); the entry file imports the bundle dynamically and returns a diagnosable `boot_failed` JSON on any boot error |
| 2 | a `window` global exists although it is a server, so `assertServerOnly()` threw "must run on the server" | `isBrowserRuntime()` = `window` AND `document` (the rule supabase-js uses); regression test added |
| 3 | `process.cpuUsage()` is **not implemented** (logs `Not implemented: process.cpuUsage()`, returns zeros) and `process.memoryUsage().rss` is 0 | the tracker now reports CPU/RSS as **unverified** unless the counters move; heap comes from a real source (test added) |

Final run: 20/20 checks. Boot ok; auth (401/401/405); scheduler-triggered call -> `kill_switch_off` (Edge read `scheduler_control` from 089); run mode -> `durable_quota_unavailable` (no Redis); test-mode gating;
lease refusal with zero provider calls; one selected event: AI answered and gates ran (`dry_run_gated`/`quality_rejected`); provider calls bounded (2 of 2 budget); one candidate reached the model; nothing written;
lease released; no secrets in captured console output; temporary secrets removed.

| Measurement (real Supabase Edge) | Cold | Warm | Limit |
|---|---|---|---|
| Client-observed request wall time | 13.5 s | 7.4 s | 150 s |
| Worker-measured wall time | 12.5 s | 6.8 s | 150 s |
| Provider latency (2 Gemini calls) | 4.5 s | 4.1 s | - |
| Tokens (generate + repair) | 2 381 in / 706 out | 2 378 in / 675 out | - |
| Heap peak | 17.2 MB | 17.2 MB | 256 MB total (RSS **unverified**: stubbed) |
| CPU | **UNVERIFIED** | **UNVERIFIED** | 2 s (exact value only in the Supabase dashboard / analytics) |

CPU bound: both invocations completed; the platform terminates an invocation that exceeds its CPU limit, so CPU stayed under the limit. That is enforcement evidence, not a measurement.
Nothing else exposes CPU: response headers carry only `sb-request-id`, `x-deno-execution-id`, `x-sb-edge-region`; the CLI has no logs/metrics command.
