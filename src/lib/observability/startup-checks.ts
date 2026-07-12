/**
 * Startup infrastructure validation — warnings only, no secrets logged.
 */

import { isRedisConfigured } from "@/lib/infrastructure/cache/redis";
import { isProductionDeployment } from "@/lib/infrastructure/production";
import { hasGscCredentialsConfigured } from "@/lib/gsc-intelligence/config";
import { logOpsEvent } from "@/lib/observability/ops-event";

type StartupCheck = {
  key: string;
  ok: boolean;
  message: string;
};

function qstashSigningConfigured(): boolean {
  return Boolean(
    process.env.QSTASH_CURRENT_SIGNING_KEY?.trim() &&
      process.env.QSTASH_NEXT_SIGNING_KEY?.trim()
  );
}

function googleSearchConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_CSE_API_KEY?.trim() && process.env.GOOGLE_CSE_CX?.trim()
  );
}

/** Run optional infra checks at boot — logs warnings, never throws. */
export function runStartupInfraChecks(): void {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const checks: StartupCheck[] = [
    {
      key: "openai",
      ok: Boolean(process.env.OPENAI_API_KEY?.trim()),
      message: "OPENAI_API_KEY not set — AI pipeline will be degraded",
    },
    {
      key: "redis",
      ok: isRedisConfigured(),
      message: "Upstash Redis not configured — ops metrics/cron heartbeats use memory fallback",
    },
    {
      key: "qstash_signing",
      ok: qstashSigningConfigured(),
      message:
        "QStash signing keys missing — QStash-signed cron requests will be rejected",
    },
    {
      key: "gsc_credentials",
      ok: hasGscCredentialsConfigured(),
      message: "Google Search Console credentials not configured — GSC intelligence disabled",
    },
    {
      key: "google_cse",
      ok: googleSearchConfigured(),
      message: "Google CSE not configured — SERP tracker disabled",
    },
    {
      key: "news_providers",
      ok: Boolean(
        process.env.GNEWS_API_KEY?.trim() || process.env.NEWSDATA_API_KEY?.trim()
      ),
      message: "No news API keys (GNEWS/NEWSDATA) — ingestion will fail",
    },
  ];

  const failed = checks.filter((c) => !c.ok);
  if (failed.length === 0) {
    logOpsEvent({
      subsystem: "startup",
      operation: "infra_checks",
      status: "ok",
      metadata: { checksPassed: checks.length },
    });
    return;
  }

  for (const check of failed) {
    const severity = isProductionDeployment() && ["openai", "redis", "qstash_signing", "news_providers"].includes(check.key)
      ? "degraded"
      : "ok";
    logOpsEvent({
      subsystem: "startup",
      operation: "infra_check",
      status: severity === "degraded" ? "degraded" : "ok",
      errorCode: check.key,
      metadata: { message: check.message },
    });
  }
}
