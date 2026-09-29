# Editorial generation on Supabase Edge Functions — design (Part 2, no code deployed)

**Goal:** the production news pipeline must not depend on Vercel Pro. Vercel Hobby serves the website; Supabase Free
(pg_cron + pg_net + Edge Functions) runs the workers. ₹0 additional platform cost.

**Status:** design + feasibility evidence only. Nothing here is deployed, no secrets were created, no Vercel/Supabase setting was changed.

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
