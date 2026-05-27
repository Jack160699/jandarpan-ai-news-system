/**
 * TEMPORARY — run one ingestion cycle with INGEST_TRACE=1.
 * Usage: node scripts/run-ingest-trace.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

function loadEnvFile(name) {
  const path = resolve(root, name);
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

process.env.INGEST_TRACE = "1";

const runner = `
import { createExecutionDeadline } from "@/lib/serverless/deadline";
import { runScalableIngestion } from "@/lib/news/pipeline/scalable-ingest";

const deadline = createExecutionDeadline();
const result = await runScalableIngestion(deadline);
console.log(JSON.stringify({ tag: "[INGEST_TRACE_RUN_COMPLETE]", result }, null, 2));
`;

const child = spawnSync(
  "npx",
  ["tsx", "-e", runner],
  {
    cwd: root,
    env: process.env,
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
    shell: true,
  }
);

process.stdout.write(child.stdout ?? "");
process.stderr.write(child.stderr ?? "");
process.exit(child.status ?? 1);
