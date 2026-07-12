/**
 * Production environment validation — fail fast on misconfiguration
 */

import { isProductionDeployment } from "@/lib/infrastructure/production";

type EnvIssue = { key: string; severity: "error" | "warn"; message: string };

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

const SECRET_PATTERNS = [
  /^sk_live_/i,
  /^sk_test_/i,
  /^eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/,
];

export function validateProductionEnv(): EnvIssue[] {
  const issues: EnvIssue[] = [];
  const isProd = isProductionDeployment();

  if (!isProd) return issues;

  const required = Object.keys(REQUIRED_PRODUCTION_ENV_MESSAGES);

  for (const key of required) {
    if (!process.env[key]?.trim()) {
      issues.push({
        key,
        severity: "error",
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
      message: "Emergency admin mode must not be enabled in production",
    });
  }

  if (process.env.ENABLE_E2E_AUTH === "1") {
    issues.push({
      key: "ENABLE_E2E_AUTH",
      severity: "error",
      message: "E2E auth must not be enabled in production",
    });
  }

  if (!process.env.SECURITY_2FA_ENCRYPTION_KEY?.trim()) {
    issues.push({
      key: "SECURITY_2FA_ENCRYPTION_KEY",
      severity: "warn",
      message:
        "2FA encryption key not set — falling back to service role key (set dedicated key for production)",
    });
  }

  if (
    isProd &&
    process.env.CRON_SECRET?.trim() &&
    !process.env.CRON_INGEST_SECRET?.trim() &&
    !process.env.CRON_PIPELINE_SECRET?.trim()
  ) {
    issues.push({
      key: "CRON_INGEST_SECRET",
      severity: "warn",
      message:
        "Consider scoped cron secrets (CRON_INGEST_SECRET, CRON_PIPELINE_SECRET, CRON_OPS_SECRET, CRON_ADMIN_SECRET) to reduce blast radius of CRON_SECRET",
    });
  }

  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  if (SECRET_PATTERNS.some((p) => p.test(anonKey))) {
    issues.push({
      key: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      severity: "error",
      message: "Anon key appears to be a service/secret key — rotate immediately",
    });
  }

  if (process.env.AI_LOCAL_ENRICH_ENABLED !== "false") {
    issues.push({
      key: "AI_LOCAL_ENRICH_ENABLED",
      severity: "warn",
      message: "Set AI_LOCAL_ENRICH_ENABLED=false in production to avoid mock AI enrichment",
    });
  }

  const hasRedis =
    Boolean(process.env.UPSTASH_REDIS_REST_URL?.trim()) &&
    Boolean(process.env.UPSTASH_REDIS_REST_TOKEN?.trim());
  if (!hasRedis) {
    issues.push({
      key: "UPSTASH_REDIS_REST_URL",
      severity: "warn",
      message:
        "Upstash Redis not configured — rate limits and distributed cache fall back to per-instance memory (not safe at scale)",
    });
  }

  return issues;
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
    console.warn(`[env-validation] ${warn.message}`);
  }
}
