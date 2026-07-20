#!/usr/bin/env node
/**
 * Idempotent QStash schedule setup for the Jandarpan newsroom pipeline.
 *
 * Production uses staggered schedules (see docs/QSTASH_SCHEDULER_SETUP.md):
 *   fetch-news → ingest → event bus enqueues editorial_generate job
 *   orchestrate → intelligence pipeline (ai_enrich, job_processor, …)
 *   editorial-generate → dedicated lane draining worker_jobs(editorial_generate)
 *
 * Editorial generation runs via event-bus enqueue + dedicated editorial-generate cron.
 * Orchestrate/job_processor exclude editorial_generate to avoid duplicate drains.
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

/** Retired schedules — removed on each setup run */
const RETIRED_SCHEDULE_IDS = [];

/** @type {Array<{ scheduleId: string; destination: string; cron: string; method: string; body?: string }>} */
const schedules = [
  {
    scheduleId: "jandarpan-fetch-news",
    destination: `${baseUrl}/api/fetch-news`,
    cron: "7,37 * * * *",
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
    scheduleId: "jandarpan-editorial-generate",
    destination: `${baseUrl}/api/cron/editorial-generate`,
    cron: "5,20,35,50 * * * *",
    method: "POST",
    body: "{}",
  },
  {
    scheduleId: "jandarpan-edition-publish",
    destination: `${baseUrl}/api/cron/edition-publish`,
    cron: "0 6,9,12,15,18,21 * * *",
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
    scheduleId: "jandarpan-translation-backfill",
    destination: `${baseUrl}/api/cron/translation-backfill`,
    cron: "10,40 * * * *",
    method: "POST",
    body: "{}",
  },
  {
    scheduleId: "jandarpan-data-cleanup",
    destination: `${baseUrl}/api/cron/cleanup`,
    cron: "30 3 * * *",
    method: "POST",
    body: "{}",
  },
];

const authHeaders = {
  Authorization: `Bearer ${cronSecret}`,
};

console.log(`Setting up QStash schedules for ${baseUrl}\n`);

for (const scheduleId of RETIRED_SCHEDULE_IDS) {
  try {
    await client.schedules.delete(scheduleId);
    console.log(JSON.stringify({ action: "deleted", scheduleId }));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(JSON.stringify({ action: "delete_skipped", scheduleId, message }));
  }
}

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
  "Manual recovery: POST /api/generate-articles or POST /api/cron/orchestrate with { workers: [\"editorial_generate\"] }."
);
console.log(
  "Dedicated lane: POST /api/cron/editorial-generate (QStash jandarpan-editorial-generate, Vercel cron backup)."
);

