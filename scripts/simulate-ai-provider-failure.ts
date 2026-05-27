/**
 * Simulate OpenAI auth failure and verify local enrich fallback drains queue items.
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createExecutionDeadline } from "../src/lib/serverless/deadline";
import { runQueueWorker } from "../src/lib/infrastructure/workers/registry";
import {
  getAiProviderHealthSummary,
  markProviderUnhealthy,
} from "../src/lib/ai/providers";
import { processAiQueueBatch } from "../src/lib/news/ai/process";

function loadEnvFile(name: string) {
  const path = resolve(process.cwd(), name);
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith("\"") && val.endsWith("\"")) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

async function main() {
  loadEnvFile(".env.local");
  loadEnvFile(".env");

  const realKey = process.env.OPENAI_API_KEY;
  console.log(JSON.stringify({ phase: "simulate_start", hadKey: Boolean(realKey) }));

  markProviderUnhealthy("openai", {
    reason: "simulated_auth_failure",
    httpStatus: 401,
    authFailure: true,
  });

  process.env.OPENAI_API_KEY = "sk-simulated-invalid-key-for-failover-test";

  const batch = await processAiQueueBatch(5);
  const health = getAiProviderHealthSummary();

  console.log(
    JSON.stringify(
      {
        phase: "simulate_batch",
        batch,
        health,
      },
      null,
      2
    )
  );

  const worker = await runQueueWorker("ai_enrich", {
    deadline: createExecutionDeadline(55_000),
    requestUrl: "http://localhost/simulate-ai-provider-failure",
  });

  console.log(JSON.stringify({ phase: "simulate_worker", worker }, null, 2));

  if (realKey) process.env.OPENAI_API_KEY = realKey;
  else delete process.env.OPENAI_API_KEY;

  console.log(JSON.stringify({ phase: "simulate_done" }));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
