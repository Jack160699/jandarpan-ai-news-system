/**
 * TEMPORARY — run one ingestion cycle with INGEST_TRACE=1.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");

function loadEnvFile(name: string) {
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

async function main() {
  const { createExecutionDeadline } = await import("@/lib/serverless/deadline");
  const { runScalableIngestion } = await import("@/lib/news/pipeline/scalable-ingest");

  const deadline = createExecutionDeadline();
  const result = await runScalableIngestion(deadline);
  console.log(JSON.stringify({ tag: "[INGEST_TRACE_RUN_COMPLETE]", result }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
