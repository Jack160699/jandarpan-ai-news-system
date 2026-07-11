# Upstash QStash — Click-by-Click Deployment Guide

**Site:** Jandarpan News  
**Dashboard:** [Upstash Console](https://console.upstash.com/) → **QStash** → **Schedules**  
**Canonical production URL:** `https://www.jandarpan.news`

Before you start, open **Vercel** → project **newspaper-motion** → **Settings** → **Environment Variables** → **Production** → copy the value of **`CRON_SECRET`**. You will paste it into every schedule’s Authorization header below.

Use `https://www.jandarpan.news` only. Do **not** use `https://jandarpan.news` (apex redirects and breaks QStash delivery).

---

## 1. Schedules to DELETE

In **Upstash → QStash → Schedules**, find each row below and delete it. If a schedule ID is not listed, skip it.

| Schedule ID to delete | Why |
|-----------------------|-----|
| `jandarpan-editorial-generate` | Retired — editorial generation is now event-driven via orchestrate |
| `jandarpan-ai-enrich` | Legacy decomposed worker — now runs inside orchestrate |
| `jandarpan-editorial-images` | Legacy decomposed worker — now runs inside orchestrate |
| `jandarpan-job-processor` | Legacy decomposed worker — now runs inside orchestrate |
| `jandarpan-ingest` | Duplicate ingest schedule (if present) |

**Do not delete:** `jandarpan-fetch-news`, `jandarpan-orchestrate`, `jandarpan-workers-health`, `jandarpan-translation-backfill`, `jandarpan-data-cleanup`.

If `jandarpan-edition-publish` already exists with cron `0 6,9,12,15,18,21 * * *` (UTC only), **do not delete it** — edit it using Section 8, Schedule 3.

---

## 2. Schedules to CREATE

You should end with **six active schedules**. One is new; five may already exist.

| Schedule ID | Action |
|-------------|--------|
| `jandarpan-edition-publish` | **CREATE** (new for edition-based publishing) |
| `jandarpan-fetch-news` | CREATE if missing, otherwise **edit** to match Section 8 |
| `jandarpan-orchestrate` | CREATE if missing, otherwise **edit** to match Section 8 |
| `jandarpan-workers-health` | CREATE if missing, otherwise **edit** to match Section 8 |
| `jandarpan-translation-backfill` | CREATE if missing, otherwise **edit** to match Section 8 |
| `jandarpan-data-cleanup` | CREATE if missing, otherwise **edit** to match Section 8 |

---

## 3. Cron expression for each schedule

| Schedule ID | Cron expression |
|-------------|-----------------|
| `jandarpan-fetch-news` | `7,37 * * * *` |
| `jandarpan-orchestrate` | `15,45 * * * *` |
| `jandarpan-edition-publish` | `CRON_TZ=Asia/Kolkata 0 6,9,12,15,18,21 * * *` |
| `jandarpan-workers-health` | `0 * * * *` |
| `jandarpan-translation-backfill` | `20 */6 * * *` |
| `jandarpan-data-cleanup` | `30 3 * * *` |

**Edition-publish note:** The timezone prefix `CRON_TZ=Asia/Kolkata` is required. Without it, publishes fire at the wrong IST minute and the app returns `outside_slot_minute` with zero articles published.

---

## 4. Endpoint URL for each schedule

| Schedule ID | Endpoint URL |
|-------------|--------------|
| `jandarpan-fetch-news` | `https://www.jandarpan.news/api/fetch-news` |
| `jandarpan-orchestrate` | `https://www.jandarpan.news/api/cron/orchestrate` |
| `jandarpan-edition-publish` | `https://www.jandarpan.news/api/cron/edition-publish` |
| `jandarpan-workers-health` | `https://www.jandarpan.news/api/cron/workers/health` |
| `jandarpan-translation-backfill` | `https://www.jandarpan.news/api/cron/translation-backfill` |
| `jandarpan-data-cleanup` | `https://www.jandarpan.news/api/cron/cleanup` |

---

## 5. HTTP method for each schedule

| Schedule ID | HTTP method |
|-------------|-------------|
| `jandarpan-fetch-news` | `POST` |
| `jandarpan-orchestrate` | `POST` |
| `jandarpan-edition-publish` | `POST` |
| `jandarpan-workers-health` | `GET` |
| `jandarpan-translation-backfill` | `POST` |
| `jandarpan-data-cleanup` | `POST` |

---

## 6. Required Authorization header for each schedule

Every schedule needs one custom header:

| Header name | Header value |
|-------------|--------------|
| `Authorization` | `Bearer <YOUR_VERCEL_CRON_SECRET>` |

Replace `<YOUR_VERCEL_CRON_SECRET>` with the **Production** `CRON_SECRET` from Vercel. Include the word `Bearer` and one space before the secret.

Example shape (do not use this literal value):

```
Bearer a1b2c3d4e5f6...
```

QStash also sends `Upstash-Signature` automatically on each delivery. No action needed — Vercel already has the signing keys configured.

---

## 7. Request body for each schedule

| Schedule ID | Request body |
|-------------|--------------|
| `jandarpan-fetch-news` | *(leave empty — no body)* |
| `jandarpan-orchestrate` | `{}` |
| `jandarpan-edition-publish` | `{}` |
| `jandarpan-workers-health` | *(leave empty — no body)* |
| `jandarpan-translation-backfill` | `{}` |
| `jandarpan-data-cleanup` | `{}` |

For schedules with body `{}`, also add header `Content-Type` = `application/json` (see Section 8).

---

## 8. Exact values to paste into every Upstash field

For each schedule: **QStash → Schedules → Create Schedule** (or open existing schedule → **Edit**).

Shared values used on multiple schedules:

| Field | Value |
|-------|-------|
| **Retries** | `3` |
| **Header: Authorization** | `Bearer <YOUR_VERCEL_CRON_SECRET>` |

---

### Schedule 1 — `jandarpan-fetch-news`

| Upstash field | Paste this value |
|---------------|------------------|
| **Schedule ID** | `jandarpan-fetch-news` |
| **Destination / URL** | `https://www.jandarpan.news/api/fetch-news` |
| **Cron** | `7,37 * * * *` |
| **Method** | `POST` |
| **Body** | *(empty)* |
| **Retries** | `3` |
| **Headers** | Name: `Authorization` → Value: `Bearer <YOUR_VERCEL_CRON_SECRET>` |

---

### Schedule 2 — `jandarpan-orchestrate`

| Upstash field | Paste this value |
|---------------|------------------|
| **Schedule ID** | `jandarpan-orchestrate` |
| **Destination / URL** | `https://www.jandarpan.news/api/cron/orchestrate` |
| **Cron** | `15,45 * * * *` |
| **Method** | `POST` |
| **Body** | `{}` |
| **Retries** | `3` |
| **Headers** | Name: `Authorization` → Value: `Bearer <YOUR_VERCEL_CRON_SECRET>` |
| **Headers** | Name: `Content-Type` → Value: `application/json` |

---

### Schedule 3 — `jandarpan-edition-publish` *(new — most important)*

| Upstash field | Paste this value |
|---------------|------------------|
| **Schedule ID** | `jandarpan-edition-publish` |
| **Destination / URL** | `https://www.jandarpan.news/api/cron/edition-publish` |
| **Cron** | `CRON_TZ=Asia/Kolkata 0 6,9,12,15,18,21 * * *` |
| **Method** | `POST` |
| **Body** | `{}` |
| **Retries** | `3` |
| **Headers** | Name: `Authorization` → Value: `Bearer <YOUR_VERCEL_CRON_SECRET>` |
| **Headers** | Name: `Content-Type` → Value: `application/json` |

**Fires at (IST):** 06:00, 09:00, 12:00, 15:00, 18:00, 21:00 — six times per day.

---

### Schedule 4 — `jandarpan-workers-health`

| Upstash field | Paste this value |
|---------------|------------------|
| **Schedule ID** | `jandarpan-workers-health` |
| **Destination / URL** | `https://www.jandarpan.news/api/cron/workers/health` |
| **Cron** | `0 * * * *` |
| **Method** | `GET` |
| **Body** | *(empty)* |
| **Retries** | `3` |
| **Headers** | Name: `Authorization` → Value: `Bearer <YOUR_VERCEL_CRON_SECRET>` |

---

### Schedule 5 — `jandarpan-translation-backfill`

| Upstash field | Paste this value |
|---------------|------------------|
| **Schedule ID** | `jandarpan-translation-backfill` |
| **Destination / URL** | `https://www.jandarpan.news/api/cron/translation-backfill` |
| **Cron** | `20 */6 * * *` |
| **Method** | `POST` |
| **Body** | `{}` |
| **Retries** | `3` |
| **Headers** | Name: `Authorization` → Value: `Bearer <YOUR_VERCEL_CRON_SECRET>` |
| **Headers** | Name: `Content-Type` → Value: `application/json` |

---

### Schedule 6 — `jandarpan-data-cleanup`

| Upstash field | Paste this value |
|---------------|------------------|
| **Schedule ID** | `jandarpan-data-cleanup` |
| **Destination / URL** | `https://www.jandarpan.news/api/cron/cleanup` |
| **Cron** | `30 3 * * *` |
| **Method** | `POST` |
| **Body** | `{}` |
| **Retries** | `3` |
| **Headers** | Name: `Authorization` → Value: `Bearer <YOUR_VERCEL_CRON_SECRET>` |
| **Headers** | Name: `Content-Type` → Value: `application/json` |

---

## 9. Verification checklist

Complete these checks in the Upstash dashboard after saving all schedules.

### Schedules list

- [ ] **Deleted:** `jandarpan-editorial-generate` no longer appears
- [ ] **Deleted:** No legacy schedules named `jandarpan-ai-enrich`, `jandarpan-editorial-images`, `jandarpan-job-processor`, or `jandarpan-ingest`
- [ ] **Present:** All six active schedule IDs exist with exact names listed in Section 2
- [ ] **Edition cron:** `jandarpan-edition-publish` shows `CRON_TZ=Asia/Kolkata 0 6,9,12,15,18,21 * * *` (not plain `0 6,9,12,15,18,21 * * *` without timezone)
- [ ] **URLs:** Every destination starts with `https://www.jandarpan.news` (not apex `jandarpan.news`)

### QStash → Logs (within 1 hour of setup)

- [ ] `jandarpan-fetch-news` deliveries return **HTTP 200**
- [ ] `jandarpan-orchestrate` deliveries return **HTTP 200**
- [ ] `jandarpan-workers-health` deliveries return **HTTP 200**
- [ ] No new deliveries to deleted `jandarpan-editorial-generate`

### Edition publish (wait for next IST window: 06:00, 09:00, 12:00, 15:00, 18:00, or 21:00)

- [ ] `jandarpan-edition-publish` delivery returns **HTTP 200**
- [ ] Response body includes `"worker": "edition-publish"` and a `"slot"` value such as `"12:00"`
- [ ] Response does **not** show `"reason": "outside_slot_minute"` (that means the cron timezone is wrong)
- [ ] If articles are queued as `scheduled`, `"published"` is greater than 0 or the queue is legitimately empty

### Expected delivery volume per day

| Schedule ID | Expected deliveries/day |
|-------------|-------------------------|
| `jandarpan-fetch-news` | 48 |
| `jandarpan-orchestrate` | 48 |
| `jandarpan-edition-publish` | 6 |
| `jandarpan-workers-health` | 24 |
| `jandarpan-translation-backfill` | 4 |
| `jandarpan-data-cleanup` | 1 |
| **Total** | **131** |

### If something fails

| Symptom | Likely cause | Fix in Upstash |
|---------|--------------|----------------|
| HTTP 401 / 403 | Wrong `CRON_SECRET` in Authorization header | Re-copy Production `CRON_SECRET` from Vercel; update all six schedules |
| HTTP 307 / redirect | Apex URL used | Change destination to `https://www.jandarpan.news/...` |
| `outside_slot_minute` on edition-publish | Cron missing IST timezone | Set cron to `CRON_TZ=Asia/Kolkata 0 6,9,12,15,18,21 * * *` |
| Signature errors in Vercel logs | Destination URL mismatch | Ensure URL in schedule exactly matches what QStash calls |

---

*Based on `QSTASH_MIGRATION.md`. Configure manually in the Upstash web dashboard only.*
