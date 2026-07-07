#!/usr/bin/env node
/**
 * Idempotent QStash schedule setup for the Jandarpan newsroom pipeline.
 *
 * Production uses four staggered schedules (see docs/QSTASH_SCHEDULER_SETUP.md):
 *   fetch-news → ingest
 *   editorial_generate → event→article generation
 *   orchestrate → intelligence pipeline (ai_enrich, editorial_images, job_processor,
 *                 intelligence_embed, intelligence_snapshot, analytics_aggregate)
 *
 * Scheduled worker job ids (health monitoring) are defined in:
 *   src/lib/infrastructure/cron/registered-jobs.ts
 *
 * Usage:
 *   QSTASH_TOKEN=... CRON_SECRET=... PRODUCTION_URL=https://www.jandarpan.news \
 *     node scripts/setup-qstash-schedules.mjs
 *
 * Re-run safely — schedules are upserted by stable scheduleId.
 */

import { Client } from "@upstash/qstash";

const token = process.env.QSTASH_TOKEN?.trim();
const cronSecret = process.env.CRON_SECRET?.trim();
const rawUrl = (process.env.PRODUCTION_URL || "https://www.jandarpan.news").trim();

function normalizeProductionUrl(url) {
  const trimmed = url.replace(/\/$/, "");
  if (/^https?:\/\/jandarpan\.news$/i.test(trimmed)) {
    return "https://www.jandarpan.news";
  }
  return trimmed;
}

if (!token) {
  console.error("Missing QSTASH_TOKEN");
  process.exit(1);
}

if (!cronSecret) {
  console.error("Missing CRON_SECRET (sent as Authorization on each QStash delivery)");
  process.exit(1);
}

const baseUrl = normalizeProductionUrl(rawUrl);
const client = new Client({ token });

/** @type {Array<{ scheduleId: string; destination: string; cron: string; method: string; body?: string }>} */
const schedules = [
  {
    scheduleId: "jandarpan-fetch-news",
    destination: `${baseUrl}/api/fetch-news`,
    cron: "7,37 * * * *",
    method: "POST",
  },
  {
    scheduleId: "jandarpan-editorial-generate",
    destination: `${baseUrl}/api/cron/worker/editorial_generate`,
    cron: "10,40 * * * *",
    method: "POST",
  },
  {
    scheduleId: "jandarpan-orchestrate",
    destination: `${baseUrl}/api/cron/orchestrate`,
    cron: "15,45 * * * *",
    method: "POST",
    body: "{}",
  },
  {
    scheduleId: "jandarpan-workers-health",
    destination: `${baseUrl}/api/cron/workers/health`,
    cron: "0 * * * *",
    method: "GET",
  },
  {
    scheduleId: "jandarpan-data-retention",
    destination: `${baseUrl}/api/cron/data-retention`,
    cron: "30 2 * * *",
    method: "POST",
    body: "{}",
  },
];

const authHeaders = {
  Authorization: `Bearer ${cronSecret}`,
};

console.log(`Setting up QStash schedules for ${baseUrl}\n`);

for (const schedule of schedules) {
  const result = await client.schedules.create({
    scheduleId: schedule.scheduleId,
    destination: schedule.destination,
    cron: schedule.cron,
    method: schedule.method,
    body: schedule.body,
    headers: authHeaders,
    retries: 3,
  });

  console.log(
    JSON.stringify({
      scheduleId: schedule.scheduleId,
      cron: schedule.cron,
      destination: schedule.destination,
      qstashScheduleId: result.scheduleId,
    })
  );
}

console.log("\nDone. Verify deliveries in the Upstash QStash console (Logs tab).");
console.log(
  "Remove legacy decomposed schedules if present (ai_enrich, editorial_images, job_processor, etc.)."
);
console.log(
  "Manual recovery: POST /api/cron/orchestrate with optional { workers: [...] } body."
);
