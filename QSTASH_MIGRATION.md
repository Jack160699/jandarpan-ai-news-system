# QStash Scheduler Migration — High-Frequency Pipeline → Edition-Based Workflow

**Project:** Jandarpan News (`newspaper-motion`)  
**Production URL (canonical):** `https://www.jandarpan.news`  
**Vercel project:** `newspaper-motion` (`prj_kJbD8R5jMyugTUpK4V95ZqhMI0YZ`)  
**Date:** 2026-07-09  
**Scope:** Scheduling infrastructure only — no application code changes in this migration.

---

## 1. Executive summary

The newsroom moved from a **high-frequency publish pipeline** (ingest → generate → publish every ~30 minutes) to an **edition-based workflow**:

| Phase | Old behavior | New behavior |
|-------|--------------|--------------|
| Ingest | QStash every 30 min | **Unchanged** — QStash every 30 min |
| AI / queues | QStash orchestrate every 30 min | **Unchanged** — QStash orchestrate every 30 min |
| Editorial generation | **Dedicated QStash schedule** (`jandarpan-editorial-generate` at `:10/:40`) | **Event-driven** — `ingest.completed` → `worker_jobs` → `job_processor` inside orchestrate |
| Publishing | Continuous / auto-publish via cron | **Edition windows** — articles stay `workflow_status=scheduled` until `edition-publish` fires at six IST slots |

**This migration:**

1. **Deletes** retired high-frequency editorial and legacy decomposed schedules.
2. **Creates or updates** six active QStash schedules (including new `jandarpan-edition-publish`).
3. **Fixes** edition-publish cron timezone so IST slot resolution (`minute === 0`) succeeds.
4. **Avoids** exporting `QSTASH_TOKEN` or `CRON_SECRET` to a developer laptop.

---

## 2. Current implementation (source of truth)

Authoritative schedule definitions live in:

```
scripts/setup-qstash-schedules.mjs
src/lib/infrastructure/cron/registered-jobs.ts
src/lib/newsroom/edition-scheduler.ts
```

Registered cron job IDs (health monitoring):

`fetch-news`, `orchestrate`, `edition-publish`, `editorial_generate` (Vercel backup only), `translation-backfill`, `cleanup`

### Edition publish windows (IST)

Resolved by `resolveEditionPublishSlot()` in `edition-scheduler.ts`:

| IST slot | Daily publish limit |
|----------|---------------------|
| 06:00 | 4 (half of morning budget) |
| 09:00 | 4 (half of morning budget) |
| 12:00 | 6 |
| 15:00 | 6 |
| 18:00 | 10 |
| 21:00 | 10 |

**Total:** 40 articles/day (`EDITORIAL_CAPACITY.dailyLimit`).

The endpoint returns `{ reason: "outside_slot_minute" }` unless the request arrives when **IST minute is exactly `:00`**.

---

## 3. Why `pnpm qstash:setup` requires local secrets

Running `pnpm qstash:setup` executes `node scripts/setup-qstash-schedules.mjs`, which **hard-exits** without:

| Variable | Why required | Where it lives in production |
|----------|--------------|------------------------------|
| `QSTASH_TOKEN` | Authenticates **outbound** calls to the Upstash Schedules API (`client.schedules.create` / `.delete`) | **Not** on Vercel runtime — Upstash Console → QStash → **Settings** → API token |
| `CRON_SECRET` | Embedded in each schedule as `Authorization: Bearer …` on every delivery | Vercel → Project → Settings → Environment Variables → **`CRON_SECRET`** (Production) |

### Root causes

1. **Setup is an Upstash admin operation**, not a Vercel runtime operation. The app verifies inbound QStash deliveries with `QSTASH_CURRENT_SIGNING_KEY` / `QSTASH_NEXT_SIGNING_KEY` (already on Vercel). Creating schedules requires a separate **management token** (`QSTASH_TOKEN`).
2. **The setup script bakes `CRON_SECRET` into schedule headers** at creation time (`authHeaders` in `setup-qstash-schedules.mjs`). Upstash stores that header; it is not read from Vercel at delivery time.
3. **`.env.example` comments out QStash vars** — local `.env.local` typically has no `QSTASH_TOKEN`, so `pnpm qstash:setup` fails immediately.
4. **No Vercel CLI env pull in the setup path** — the script does not call `vercel env pull` or the Vercel API; it only reads `process.env`.

### What is already on Vercel (use these — do not duplicate)

| Variable | Vercel Production | Purpose |
|----------|-------------------|---------|
| `CRON_SECRET` | ✅ Required | Bearer auth on cron routes |
| `QSTASH_CURRENT_SIGNING_KEY` | ✅ Required | Verify `Upstash-Signature` JWT |
| `QSTASH_NEXT_SIGNING_KEY` | ✅ Required | Signing key rotation |
| `QSTASH_TOKEN` | ❌ Not needed at runtime | Setup/migration only |
| `NEXT_PUBLIC_SITE_URL` / domains | ✅ `www.jandarpan.news` | Canonical destination host |

**Important:** Use `https://www.jandarpan.news` (not apex `jandarpan.news`). Apex returns HTTP 307 and breaks QStash JWT URL matching.

---

## 4. Migrate without local secrets

Local execution is **not required**. Use one of these paths:

### Option A — Upstash Console (recommended, zero local secrets)

1. Open [Upstash Console](https://console.upstash.com/) → **QStash** → **Schedules**.
2. **Delete** schedules listed in [Section 5](#5-schedules-to-delete).
3. For each schedule in [Section 6](#6-schedules-to-create-or-update), click **Create Schedule** (or edit if `scheduleId` already exists).
4. For **Authorization**, open Vercel → `newspaper-motion` → Settings → Environment Variables → copy **Production** `CRON_SECRET` into the schedule header field in the browser. Nothing is written to disk on your machine except the browser session.

### Option B — One-shot curl from Upstash Console (token never leaves browser)

Upstash Console often provides a **cURL** preview when creating a schedule. Paste the cURL into the browser devtools console or Upstash's request builder. Substitute:

- `{{QSTASH_TOKEN}}` — from QStash → Settings (copy in browser)
- `{{CRON_SECRET}}` — from Vercel Production env (copy in browser)

Use the exact payloads in [Section 8](#8-ready-to-import-migration-file).

### Option C — GitHub Actions one-shot (secrets already in repo)

If `PRODUCTION_URL` and `CRON_SECRET` exist as GitHub repository secrets, add a **manual** workflow that sets `QSTASH_TOKEN` from a new GitHub secret and runs `pnpm qstash:setup`. This keeps tokens off laptops while still automating idempotent upsert.

### Option D — Future setup improvement (documented, not applied here)

To make `pnpm qstash:setup` work without local secrets in a later PR:

- Pull `CRON_SECRET` via `vercel env pull --environment=production` in CI only.
- Read `QSTASH_TOKEN` from GitHub Actions / Upstash OIDC — never from `.env.local`.
- For `edition-publish`, use `CRON_TZ=Asia/Kolkata` in the cron expression (see Section 6.3).

**This migration does not modify `setup-qstash-schedules.mjs`.** Apply the cron fix manually in Upstash until the script is updated.

---

## 5. Schedules to DELETE

Delete these in **Upstash → QStash → Schedules** before or during migration.

| Schedule ID | Old cron (UTC unless noted) | Old destination | Reason |
|-------------|----------------------------|-----------------|--------|
| `jandarpan-editorial-generate` | `10,40 * * * *` | `POST https://www.jandarpan.news/api/cron/worker/editorial_generate` | **Retired** — generation is event-driven via orchestrate `job_processor` |
| `jandarpan-ai-enrich` | (varies) | `/api/cron/worker/ai_enrich` or similar | Legacy decomposed worker — folded into orchestrate |
| `jandarpan-editorial-images` | (varies) | `/api/cron/worker/editorial_images` | Legacy decomposed worker |
| `jandarpan-job-processor` | (varies) | `/api/cron/worker/job_processor` | Legacy decomposed worker |
| `jandarpan-ingest` | (varies) | `/api/fetch-news` or ingest worker | Duplicate of `jandarpan-fetch-news` if present |

**Keep** `jandarpan-orchestrate` — it is still the intelligence pipeline runner (not legacy in current architecture).

If `jandarpan-edition-publish` already exists with cron `0 6,9,12,15,18,21 * * *` (UTC), **update** it (Section 6.3) rather than deleting — wrong timezone causes zero publishes.

---

## 6. Schedules to CREATE or UPDATE

All destinations use base URL: **`https://www.jandarpan.news`**

All schedules use:

| Setting | Value |
|---------|-------|
| Retries | `3` |
| Header `Authorization` | `Bearer {{CRON_SECRET}}` |
| Header `Content-Type` | `application/json` (POST routes with body only) |

QStash automatically attaches `Upstash-Signature` on delivery; Vercel verifies it with existing signing keys.

---

### 6.1 `jandarpan-fetch-news` (unchanged)

| Field | Value |
|-------|-------|
| **Schedule ID** | `jandarpan-fetch-news` |
| **Cron (UTC)** | `7,37 * * * *` |
| **Method** | `POST` |
| **Destination URL** | `https://www.jandarpan.news/api/fetch-news` |
| **Body** | *(empty)* |
| **Authorization** | `Bearer {{CRON_SECRET}}` |
| **Deliveries/day** | 48 |

---

### 6.2 `jandarpan-orchestrate` (unchanged)

| Field | Value |
|-------|-------|
| **Schedule ID** | `jandarpan-orchestrate` |
| **Cron (UTC)** | `15,45 * * * *` |
| **Method** | `POST` |
| **Destination URL** | `https://www.jandarpan.news/api/cron/orchestrate` |
| **Body** | `{}` |
| **Authorization** | `Bearer {{CRON_SECRET}}` |
| **Deliveries/day** | 48 |

Runs `ai_enrich`, `job_processor`, `editorial_images`, etc. inline. Editorial generation flows through `job_processor` after ingest events — not a separate schedule.

---

### 6.3 `jandarpan-edition-publish` (NEW — critical timezone fix)

| Field | Value |
|-------|-------|
| **Schedule ID** | `jandarpan-edition-publish` |
| **Cron** | `CRON_TZ=Asia/Kolkata 0 6,9,12,15,18,21 * * *` |
| **Method** | `POST` |
| **Destination URL** | `https://www.jandarpan.news/api/cron/edition-publish` |
| **Body** | `{}` |
| **Authorization** | `Bearer {{CRON_SECRET}}` |
| **Deliveries/day** | 6 |

#### Why not `0 6,9,12,15,18,21 * * *` (plain UTC)?

`setup-qstash-schedules.mjs` currently sets plain UTC hours. QStash fires at e.g. `06:00 UTC` = **`11:30 IST`**. The edition resolver requires IST `minute === 0`, so every run returns:

```json
{ "ok": true, "reason": "outside_slot_minute", "published": 0 }
```

**Fix (choose one):**

| Approach | Cron expression | Notes |
|----------|-----------------|-------|
| **Recommended** | `CRON_TZ=Asia/Kolkata 0 6,9,12,15,18,21 * * *` | Matches `edition-scheduler.ts` slot labels literally |
| Alternative (UTC) | `30 0,3,6,9,12,15 * * *` | Same instants: 00:30, 03:30, 06:30, 09:30, 12:30, 15:30 UTC |

---

### 6.4 `jandarpan-workers-health` (unchanged)

| Field | Value |
|-------|-------|
| **Schedule ID** | `jandarpan-workers-health` |
| **Cron (UTC)** | `0 * * * *` |
| **Method** | `GET` |
| **Destination URL** | `https://www.jandarpan.news/api/cron/workers/health` |
| **Body** | *(none)* |
| **Authorization** | `Bearer {{CRON_SECRET}}` |
| **Deliveries/day** | 24 |

---

### 6.5 `jandarpan-translation-backfill` (unchanged)

| Field | Value |
|-------|-------|
| **Schedule ID** | `jandarpan-translation-backfill` |
| **Cron (UTC)** | `20 */6 * * *` |
| **Method** | `POST` |
| **Destination URL** | `https://www.jandarpan.news/api/cron/translation-backfill` |
| **Body** | `{}` |
| **Authorization** | `Bearer {{CRON_SECRET}}` |
| **Deliveries/day** | 4 |

---

### 6.6 `jandarpan-data-cleanup` (unchanged)

| Field | Value |
|-------|-------|
| **Schedule ID** | `jandarpan-data-cleanup` |
| **Cron (UTC)** | `30 3 * * *` |
| **Method** | `POST` |
| **Destination URL** | `https://www.jandarpan.news/api/cron/cleanup` |
| **Body** | `{}` |
| **Authorization** | `Bearer {{CRON_SECRET}}` |
| **Deliveries/day** | 1 |

---

## 7. Vercel Cron backup layer (no QStash change)

`vercel.json` retains **daily** backup crons (not primary scheduler):

| Path | Cron (UTC) | Role |
|------|------------|------|
| `/api/fetch-news` | `15 0 * * *` | Daily ingest backup |
| `/api/cron/worker/editorial_generate` | `45 0 * * *` | Daily editorial backup (not QStash) |
| `/api/cron/translation-backfill` | `20 1 * * *` | Daily translation drain backup |
| `/api/cron/cleanup` | `30 3 * * *` | Daily cleanup (overlaps QStash `jandarpan-data-cleanup`) |

There is **no** Vercel cron for `edition-publish` — edition publishing is **QStash-only**. If QStash edition schedule is wrong, scheduled articles accumulate unpublished.

---

## 8. Ready-to-import migration file

Save as `qstash-edition-migration.json` or run the shell script below from any environment where you can inject secrets **without writing them to the repo**.

### 8.1 JSON specification

```json
{
  "migration": "jandarpan-high-frequency-to-edition-workflow",
  "version": "2026-07-09",
  "productionUrl": "https://www.jandarpan.news",
  "secrets": {
    "QSTASH_TOKEN": "FROM_UPSTASH_CONSOLE_QSTASH_SETTINGS",
    "CRON_SECRET": "FROM_VERCEL_PRODUCTION_ENV_CRON_SECRET"
  },
  "deleteScheduleIds": [
    "jandarpan-editorial-generate",
    "jandarpan-ai-enrich",
    "jandarpan-editorial-images",
    "jandarpan-job-processor",
    "jandarpan-ingest"
  ],
  "schedules": [
    {
      "scheduleId": "jandarpan-fetch-news",
      "destination": "https://www.jandarpan.news/api/fetch-news",
      "cron": "7,37 * * * *",
      "method": "POST",
      "body": null,
      "retries": 3,
      "headers": {
        "Authorization": "Bearer {{CRON_SECRET}}"
      }
    },
    {
      "scheduleId": "jandarpan-orchestrate",
      "destination": "https://www.jandarpan.news/api/cron/orchestrate",
      "cron": "15,45 * * * *",
      "method": "POST",
      "body": "{}",
      "retries": 3,
      "headers": {
        "Authorization": "Bearer {{CRON_SECRET}}",
        "Content-Type": "application/json"
      }
    },
    {
      "scheduleId": "jandarpan-edition-publish",
      "destination": "https://www.jandarpan.news/api/cron/edition-publish",
      "cron": "CRON_TZ=Asia/Kolkata 0 6,9,12,15,18,21 * * *",
      "method": "POST",
      "body": "{}",
      "retries": 3,
      "headers": {
        "Authorization": "Bearer {{CRON_SECRET}}",
        "Content-Type": "application/json"
      },
      "notes": "CRITICAL: replaces broken UTC-only cron from setup-qstash-schedules.mjs"
    },
    {
      "scheduleId": "jandarpan-workers-health",
      "destination": "https://www.jandarpan.news/api/cron/workers/health",
      "cron": "0 * * * *",
      "method": "GET",
      "body": null,
      "retries": 3,
      "headers": {
        "Authorization": "Bearer {{CRON_SECRET}}"
      }
    },
    {
      "scheduleId": "jandarpan-translation-backfill",
      "destination": "https://www.jandarpan.news/api/cron/translation-backfill",
      "cron": "20 */6 * * *",
      "method": "POST",
      "body": "{}",
      "retries": 3,
      "headers": {
        "Authorization": "Bearer {{CRON_SECRET}}",
        "Content-Type": "application/json"
      }
    },
    {
      "scheduleId": "jandarpan-data-cleanup",
      "destination": "https://www.jandarpan.news/api/cron/cleanup",
      "cron": "30 3 * * *",
      "method": "POST",
      "body": "{}",
      "retries": 3,
      "headers": {
        "Authorization": "Bearer {{CRON_SECRET}}",
        "Content-Type": "application/json"
      }
    }
  ]
}
```

### 8.2 Bash apply script (idempotent upsert)

Run from a secure shell where `QSTASH_TOKEN` and `CRON_SECRET` are set as **environment variables** (CI, cloud shell, or ephemeral session — not committed to git).

```bash
#!/usr/bin/env bash
# qstash-apply-edition-migration.sh
set -euo pipefail

: "${QSTASH_TOKEN:?Set QSTASH_TOKEN from Upstash Console}"
: "${CRON_SECRET:?Set CRON_SECRET from Vercel Production}"

API="https://qstash.upstash.io/v2/schedules"
AUTH_QSTASH="Authorization: Bearer ${QSTASH_TOKEN}"
AUTH_CRON="Authorization: Bearer ${CRON_SECRET}"

delete_schedule() {
  local id="$1"
  curl -sS -X DELETE "${API}/${id}" -H "${AUTH_QSTASH}" || true
  echo "DELETE ${id}"
}

upsert_schedule() {
  local schedule_id="$1" dest="$2" cron="$3" method="$4" body="${5:-}"

  local -a curl_args=(
    -sS -X POST "${API}/${dest}"
    -H "${AUTH_QSTASH}"
    -H "Upstash-Schedule-Id: ${schedule_id}"
    -H "Upstash-Cron: ${cron}"
    -H "Upstash-Method: ${method}"
    -H "Upstash-Retries: 3"
    -H "Upstash-Forward-Authorization: Bearer ${CRON_SECRET}"
  )

  if [[ -n "${body}" ]]; then
    curl_args+=(-H "Content-Type: application/json" -d "${body}")
  fi

  curl "${curl_args[@]}"
  echo ""
  echo "UPSERT ${schedule_id} -> ${dest} (${cron})"
}

BASE="https://www.jandarpan.news"

# --- DELETE retired ---
for id in \
  jandarpan-editorial-generate \
  jandarpan-ai-enrich \
  jandarpan-editorial-images \
  jandarpan-job-processor \
  jandarpan-ingest
do
  delete_schedule "$id"
done

# --- UPSERT active ---
upsert_schedule "jandarpan-fetch-news" \
  "${BASE}/api/fetch-news" "7,37 * * * *" "POST" ""

upsert_schedule "jandarpan-orchestrate" \
  "${BASE}/api/cron/orchestrate" "15,45 * * * *" "POST" "{}"

upsert_schedule "jandarpan-edition-publish" \
  "${BASE}/api/cron/edition-publish" \
  "CRON_TZ=Asia/Kolkata 0 6,9,12,15,18,21 * * *" "POST" "{}"

upsert_schedule "jandarpan-workers-health" \
  "${BASE}/api/cron/workers/health" "0 * * * *" "GET" ""

upsert_schedule "jandarpan-translation-backfill" \
  "${BASE}/api/cron/translation-backfill" "20 */6 * * *" "POST" "{}"

upsert_schedule "jandarpan-data-cleanup" \
  "${BASE}/api/cron/cleanup" "30 3 * * *" "POST" "{}"

echo "Done. Verify in Upstash Console -> QStash -> Logs."
```

> **Note:** Upstash also accepts schedule headers via `headers` in the JS SDK (`setup-qstash-schedules.mjs` uses `headers: { Authorization: ... }`). The REST API uses `Upstash-Forward-*` prefixes for forwarded headers. If `Upstash-Forward-Authorization` is rejected by your QStash plan/version, create schedules in the Console UI or use the official `@upstash/qstash` client with the `headers` object exactly as in `setup-qstash-schedules.mjs`.

### 8.3 Per-schedule cURL templates (Console copy-paste)

Replace `XXX` with `QSTASH_TOKEN` and `YYY` with Production `CRON_SECRET`.

**Delete retired editorial schedule:**

```bash
curl -X DELETE "https://qstash.upstash.io/v2/schedules/jandarpan-editorial-generate" \
  -H "Authorization: Bearer XXX"
```

**Create / update edition-publish (critical):**

```bash
curl -X POST "https://qstash.upstash.io/v2/schedules/https://www.jandarpan.news/api/cron/edition-publish" \
  -H "Authorization: Bearer XXX" \
  -H "Upstash-Schedule-Id: jandarpan-edition-publish" \
  -H "Upstash-Cron: CRON_TZ=Asia/Kolkata 0 6,9,12,15,18,21 * * *" \
  -H "Upstash-Method: POST" \
  -H "Upstash-Retries: 3" \
  -H "Content-Type: application/json" \
  -H "Upstash-Forward-Authorization: Bearer YYY" \
  -d '{}'
```

When using the JS SDK (as the repo script does), the equivalent call is:

```javascript
await client.schedules.create({
  scheduleId: "jandarpan-edition-publish",
  destination: "https://www.jandarpan.news/api/cron/edition-publish",
  cron: "CRON_TZ=Asia/Kolkata 0 6,9,12,15,18,21 * * *",
  method: "POST",
  body: "{}",
  headers: { Authorization: "Bearer <CRON_SECRET>" },
  retries: 3,
});
```

---

## 9. Authentication reference

Inbound requests to cron routes accept **either**:

1. `Authorization: Bearer <CRON_SECRET>` (or `x-cron-secret`)
2. Valid `Upstash-Signature` JWT (verified with `QSTASH_CURRENT_SIGNING_KEY` / `QSTASH_NEXT_SIGNING_KEY` on Vercel)

QStash schedules should send **both** for defense in depth.

| Header | Set by | Value source |
|--------|--------|--------------|
| `Authorization` | Schedule config (static) | Vercel Production `CRON_SECRET` |
| `Upstash-Signature` | QStash (per delivery) | Verified with Vercel signing keys |
| `Content-Type` | Schedule config | `application/json` when body is `{}` |

---

## 10. Post-migration verification

### 10.1 Upstash Console

- [ ] Retired schedules absent (`jandarpan-editorial-generate`, decomposed workers).
- [ ] Six active schedules present with correct `scheduleId` values.
- [ ] `jandarpan-edition-publish` cron shows `CRON_TZ=Asia/Kolkata` or equivalent UTC `30 0,3,6,9,12,15 * * *`.
- [ ] **Logs** tab: `edition-publish` deliveries at IST `:00` return HTTP 200, not `outside_slot_minute`.

### 10.2 Expected response at edition window

At a valid IST slot (e.g. 12:00 IST):

```json
{
  "ok": true,
  "worker": "edition-publish",
  "slot": "12:00",
  "limit": 6,
  "published": <n>,
  "reason": null
}
```

Outside windows:

```json
{
  "ok": true,
  "reason": "outside_slot_hour",
  "published": 0
}
```

### 10.3 Supabase spot check

```sql
SELECT workflow_status, count(*)
FROM generated_articles
WHERE published_at IS NULL
GROUP BY workflow_status;
```

Scheduled backlog should drain by up to edition limit at each window.

### 10.4 Delivery volume (approximate)

| Schedule | Deliveries/day |
|----------|----------------|
| fetch-news | 48 |
| orchestrate | 48 |
| edition-publish | 6 |
| workers-health | 24 |
| translation-backfill | 4 |
| data-cleanup | 1 |
| **Total** | **131** |

Down from ~**144+** when `jandarpan-editorial-generate` was active (48 extra editorial fires/day).

---

## 11. Rollback

If edition publishing causes issues:

1. **Pause** `jandarpan-edition-publish` in Upstash (do not delete).
2. **Re-enable** `jandarpan-editorial-generate` only if `EDITORIAL_GENERATE_BACKUP_CRON=true` is set on Vercel (disaster recovery path documented in setup script).
3. Manual publish: `POST /api/generate-articles` or orchestrate with `{ "workers": ["editorial_generate"] }` using `CRON_SECRET`.

Rollback restores high-frequency generation but **does not** restore continuous auto-publish — generation still writes `workflow_status=scheduled` in the edition-based code path.

---

## 12. Related documentation drift

Update separately (out of scope for this migration file):

| Doc | Issue |
|-----|-------|
| `docs/QSTASH_SCHEDULER_SETUP.md` | Still lists `jandarpan-editorial-generate`; missing edition-publish and timezone note |
| `engineering-audit/03-news-pipeline.md` | Pre-edition schedule table |

**Canonical spec after migration:** Section 6 of this document + `scripts/setup-qstash-schedules.mjs` (except edition-publish cron — use Section 6.3 until script is patched).

---

## 13. Migration checklist (operator)

- [ ] Confirm Vercel Production has `CRON_SECRET`, `QSTASH_CURRENT_SIGNING_KEY`, `QSTASH_NEXT_SIGNING_KEY`.
- [ ] Open Upstash QStash Schedules; export or screenshot current schedules (backup).
- [ ] Delete retired schedule IDs (Section 5).
- [ ] Upsert six active schedules (Section 6); **apply IST cron fix** on edition-publish.
- [ ] Wait for next IST edition window; confirm Logs show `published > 0` or valid empty queue.
- [ ] Confirm `jandarpan-editorial-generate` deliveries stopped in Logs.
- [ ] Do **not** commit secrets or this file with real tokens substituted.

---

*Generated for DevOps scheduling migration only. No application code, commits, or deployments were performed.*
