/**
 * Diagnose OpenAI auth — never prints full API key.
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { classifyAiHttpFailure, parseOpenAiErrorBody } from "../src/lib/ai/providers/errors";

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

  const key = process.env.OPENAI_API_KEY?.trim() ?? "";
  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";

  console.log(
    JSON.stringify(
      {
        phase: "diagnose_start",
        keyPresent: Boolean(key),
        keyPrefix: key ? `${key.slice(0, 7)}…` : null,
        keyLength: key.length,
        looksLikeOpenAi: /^sk-/.test(key),
        model,
      },
      null,
      2
    )
  );

  if (!key) {
    console.log(JSON.stringify({ phase: "diagnose_done", rootCause: "missing_key" }));
    return;
  }

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 8,
      messages: [{ role: "user", content: "ping" }],
    }),
    signal: AbortSignal.timeout(12_000),
  });

  const body = await res.text();
  const parsed = parseOpenAiErrorBody(body);
  const classified = classifyAiHttpFailure(res.status, body);

  console.log(
    JSON.stringify(
      {
        phase: "diagnose_done",
        httpStatus: res.status,
        ok: res.ok,
        errorType: parsed.type ?? null,
        errorCode: parsed.code ?? null,
        message: parsed.message,
        classified: {
          code: classified.code,
          authFailure: classified.authFailure,
          retryable: classified.retryable,
        },
        rootCause:
          res.status === 401
            ? "invalid_or_revoked_api_key"
            : res.status === 403
              ? "forbidden_model_or_org"
              : res.ok
                ? "auth_ok"
                : classified.invalidRequest
                  ? "invalid_request"
                  : "upstream_error",
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
