/**
 * Production environment validation — fail fast on misconfiguration
 */

import { isProductionDeployment } from "@/lib/infrastructure/production";

type EnvIssue = { key: string; severity: "error" | "warn"; message: string };

const SECRET_PATTERNS = [
  /^sk_live_/i,
  /^sk_test_/i,
  /^eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/,
];

export function validateProductionEnv(): EnvIssue[] {
  const issues: EnvIssue[] = [];
  const isProd = isProductionDeployment();

  if (!isProd) return issues;

  const required = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "CRON_SECRET",
    "NEWSROOM_SUPER_ADMIN_EMAILS",
  ];

  for (const key of required) {
    if (!process.env[key]?.trim()) {
      issues.push({
        key,
        severity: "error",
        message: `Missing required production env: ${key}`,
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

  if (!process.env.NEXT_PUBLIC_SITE_URL?.trim()) {
    issues.push({
      key: "NEXT_PUBLIC_SITE_URL",
      severity: "warn",
      message:
        "NEXT_PUBLIC_SITE_URL is not set — canonical URLs and production readiness score will be degraded",
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
