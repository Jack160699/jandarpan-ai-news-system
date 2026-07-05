#!/usr/bin/env node
/**
 * Idempotent QStash schedule setup for the Jandarpan newsroom pipeline.
 *
 * Decomposed workers — no full ingest/editorial in orchestrate (avoids triple-fire).
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
    scheduleId: "jandarpan-ai-enrich",
    destination: `${baseUrl}/api/cron/worker/ai_enrich`,
    cron: "12,42 * * * *",
    method: "POST",
  },
  {
    scheduleId: "jandarpan-editorial-images",
    destination: `${baseUrl}/api/cron/worker/editorial_images`,
    cron: "14,44 * * * *",
    method: "POST",
  },
  {
    scheduleId: "jandarpan-job-processor",
    destination: `${baseUrl}/api/cron/worker/job_processor`,
    cron: "16,46 * * * *",
    method: "POST",
  },
  {
    scheduleId: "jandarpan-intelligence-embed",
    destination: `${baseUrl}/api/cron/worker/intelligence_embed`,
    cron: "18,48 * * * *",
    method: "POST",
  },
  {
    scheduleId: "jandarpan-intelligence-snapshot",
    destination: `${baseUrl}/api/cron/worker/intelligence_snapshot`,
    cron: "22,52 * * * *",
    method: "POST",
  },
  {
    scheduleId: "jandarpan-analytics-aggregate",
    destination: `${baseUrl}/api/cron/worker/analytics_aggregate`,
    cron: "24,54 * * * *",
    method: "POST",
  },
  {
    scheduleId: "jandarpan-workers-health",
    destination: `${baseUrl}/api/cron/workers/health`,
    cron: "0 * * * *",
    method: "GET",
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
  "Manual orchestrate: POST /api/cron/orchestrate with optional { workers: [...] } body."
);
console.log(
  "Remove legacy jandarpan-orchestrate schedule if it still runs full ingest+editorial."
);
