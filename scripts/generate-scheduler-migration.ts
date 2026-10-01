/**
 * Regenerates the pg_cron registration block inside scheduler migration 090 from
 * src/lib/infrastructure/cron/scheduler-manifest.ts.
 *
 *   pnpm exec tsx scripts/generate-scheduler-migration.ts
 *
 * The block between the BEGIN/END markers is replaced; everything else in the
 * migration is hand-written. scheduler-manifest.test.ts fails if they drift.
 */

import fs from "node:fs";
import path from "node:path";
import { renderSchedulerSql } from "../src/lib/infrastructure/cron/scheduler-manifest";

const MIGRATION = path.join(
  __dirname,
  "..",
  "supabase",
  "migrations",
  "20261001000000_090_edge_workers.sql"
);
const BEGIN = "-- BEGIN GENERATED JOBS (scripts/generate-scheduler-migration.ts)";
const END = "-- END GENERATED JOBS";

const raw = fs.readFileSync(MIGRATION, "utf8");
const crlf = raw.includes("\r\n");
const text = raw.replace(/\r\n/g, "\n");
const start = text.indexOf(BEGIN);
const end = text.indexOf(END);
if (start < 0 || end < 0) throw new Error("markers not found in " + MIGRATION);

const next =
  text.slice(0, start + BEGIN.length) + "\n" + renderSchedulerSql() + "\n" + text.slice(end);
fs.writeFileSync(MIGRATION, crlf ? next.replace(/\n/g, "\r\n") : next);
console.log("scheduler migration regenerated");
