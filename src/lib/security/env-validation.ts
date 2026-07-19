/**
 * Production environment validation — fail fast on misconfiguration.
 * Optional integrations must warn, never escalate the whole platform to Critical.
 */

import { isProductionDeployment } from "@/lib/infrastructure/production";
import { isLocalEnrichMisconfiguredForProduction } from "@/lib/ai/providers/local-enrich-flag";

export type EnvIssue = {
  key: string;
  severity: "error" | "warn";
  message: string;
  /** optional = integration; required = platform infrastructure */
  class: "required" | "optional" | "security";
};

/** Production-required keys with actionable startup messages. */
const REQUIRED_PRODUCTION_ENV_MESSAGES: Record<string, string> = {
  NEXT_PUBLIC_SUPABASE_URL:
    "Missing NEXT_PUBLIC_SUPABASE_URL — set Supabase Project URL in Vercel (Dashboard → Settings → API)",
  NEXT_PUBLIC_SUPABASE_ANON_KEY:
    "Missing NEXT_PUBLIC_SUPABASE_ANON_KEY — use the publishable/anon key from Supabase Dashboard → API Keys",
  SUPABASE_SERVICE_ROLE_KEY:
    "Missing SUPABASE_SERVICE_ROLE_KEY — server-only secret; never expose to the browser",
  CRON_SECRET:
    "Missing CRON_SECRET — generate with `openssl rand -hex 32`; required for Vercel cron and QStash auth",
  NEWSROOM_SUPER_ADMIN_EMAILS:
    "Missing NEWSROOM_SUPER_ADMIN_EMAILS — comma-separated super-admin emails for RBAC bootstrap",
  NEXT_PUBLIC_SITE_URL:
    "Missing NEXT_PUBLIC_SITE_URL — canonical domain for SEO, sitemaps, Open Graph URLs, and invite links",
};

const SCOPED_CRON_SECRETS = [
  "CRON_INGEST_SECRET",
  "CRON_PIPELINE_SECRET",
  "CRON_OPS_SECRET",
  "CRON_ADMIN_SECRET",
] as const;

const SECRET_PATTERNS = [
  /^sk_live_/i,
  /^sk_test_/i,
  /^eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/,
];

export function validateProductionEnv(): EnvIssue[] {
  const issues: EnvIssue[] = [];
  const isProd = isProductionDeployment();

  if (!isProd) return issues;

  for (const key of Object.keys(REQUIRED_PRODUCTION_ENV_MESSAGES)) {
    if (!process.env[key]?.trim()) {
      issues.push({
        key,
        severity: "error",
        class: "required",
        message:
          REQUIRED_PRODUCTION_ENV_MESSAGES[key] ??
          `Missing required production env: ${key}`,
      });
    }
  }

  if (
    process.env.ADMIN_EMERGENCY_MODE === "1" ||
    process.env.NEXT_PUBLIC_ADMIN_EMERGENCY_MODE === "1"
  ) {
    issues.push({
      key: "ADMIN_EMERGENCY_MODE",
      severity: "error",
      class: "security",
      message: "Emergency admin mode must not be enabled in production",
    });
  }

  if (process.env.ENABLE_E2E_AUTH === "1") {
    issues.push({
      key: "ENABLE_E2E_AUTH",
      severity: "error",
      class: "security",
      message: "E2E auth must not be enabled in production",
    });
  }

  if (!process.env.SECURITY_2FA_ENCRYPTION_KEY?.trim()) {
    issues.push({
      key: "SECURITY_2FA_ENCRYPTION_KEY",
      severity: "warn",
      class: "security",
      message:
        "Dedicated 2FA encryption key not set — falling back to service role key (set SECURITY_2FA_ENCRYPTION_KEY)",
    });
  }

  const missingScoped = SCOPED_CRON_SECRETS.filter(
    (k) => !process.env[k]?.trim()
  );
  if (process.env.CRON_SECRET?.trim() && missingScoped.length > 0) {
    issues.push({
      key: "CRON_INGEST_SECRET",
      severity: "warn",
      class: "security",
      message: `Scoped cron secrets missing (${missingScoped.join(", ")}) — CRON_SECRET remains as migration fallback; rotate to scoped secrets when schedules are updated`,
    });
  }

  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  if (SECRET_PATTERNS.some((p) => p.test(anonKey))) {
    issues.push({
      key: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      severity: "error",
      class: "security",
      message: "Anon key appears to be a service/secret key — rotate immediately",
    });
  }

  if (isLocalEnrichMisconfiguredForProduction()) {
    issues.push({
      key: "AI_LOCAL_ENRICH_ENABLED",
      severity: "warn",
      class: "security",
      message:
        "Set AI_LOCAL_ENRICH_ENABLED=false in production (local/mock enrichment must stay off)",
    });
  }

  const hasRedis =
    Boolean(process.env.UPSTASH_REDIS_REST_URL?.trim()) &&
    Boolean(process.env.UPSTASH_REDIS_REST_TOKEN?.trim());
  if (!hasRedis) {
    issues.push({
      key: "UPSTASH_REDIS_REST_URL",
      severity: "warn",
      class: "optional",
      message:
        "Upstash Redis not configured — rate limits and distributed cache fall back to per-instance memory (correctness unaffected; multi-instance cache consistency degraded)",
    });
  }

  const hasGoogleCse =
    Boolean(process.env.GOOGLE_CSE_API_KEY?.trim()) &&
    Boolean(process.env.GOOGLE_CSE_CX?.trim());
  if (!hasGoogleCse) {
    issues.push({
      key: "GOOGLE_CSE_API_KEY",
      severity: "warn",
      class: "optional",
      message:
        "Google CSE not configured — SERP intelligence disabled (optional integration; not platform-critical)",
    });
  }

  if (!process.env.OPENAI_API_KEY?.trim() && !process.env.OPENROUTER_API_KEY?.trim()) {
    issues.push({
      key: "OPENAI_API_KEY",
      severity: "warn",
      class: "optional",
      message:
        "No cloud AI provider keys — editorial generation requires OPENAI_API_KEY or OPENROUTER_API_KEY",
    });
  }

  return issues;
}

/** Checklist of expected production variable names (never values). */
export function listExpectedProductionEnvNames(): {
  required: string[];
  recommendedScopedCron: string[];
  optionalIntegrations: string[];
  security: string[];
} {
  return {
    required: Object.keys(REQUIRED_PRODUCTION_ENV_MESSAGES),
    recommendedScopedCron: [...SCOPED_CRON_SECRETS],
    optionalIntegrations: [
      "UPSTASH_REDIS_REST_URL",
      "UPSTASH_REDIS_REST_TOKEN",
      "GOOGLE_CSE_API_KEY",
      "GOOGLE_CSE_CX",
      "OPENAI_API_KEY",
      "OPENROUTER_API_KEY",
      "GNEWS_API_KEY",
      "NEWSDATA_API_KEY",
      "QSTASH_TOKEN",
      "QSTASH_CURRENT_SIGNING_KEY",
      "QSTASH_NEXT_SIGNING_KEY",
      "SEO_COMPETITOR_TRACKER",
    ],
    security: [
      "SECURITY_2FA_ENCRYPTION_KEY",
      "AI_LOCAL_ENRICH_ENABLED",
      "CRON_SECRET",
      ...SCOPED_CRON_SECRETS,
    ],
  };
}

export function assertProductionEnvSafe(): void {
  const issues = validateProductionEnv();
  const errors = issues.filter((i) => i.severity === "error");
  const strict =
    process.env.SECURITY_ENV_STRICT === "1" || isProductionDeployment();

  if (errors.length > 0 && strict) {
    throw new Error(
      `Production env validation failed:\n${errors.map((e) => `- ${e.message}`).join("\n")}`
    );
  }

  for (const warn of issues.filter((i) => i.severity === "warn")) {
    console.warn(`[env-validation] [${warn.class}] ${warn.message}`);
  }
}
