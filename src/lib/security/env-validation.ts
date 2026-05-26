/**
 * Production environment validation — fail fast on misconfiguration
 */

type EnvIssue = { key: string; severity: "error" | "warn"; message: string };

const SECRET_PATTERNS = [
  /^sk_live_/i,
  /^sk_test_/i,
  /^eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/,
];

export function validateProductionEnv(): EnvIssue[] {
  const issues: EnvIssue[] = [];
  const isProd =
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL_ENV === "production";

  if (!isProd) return issues;

  const required = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "CRON_SECRET",
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

  if (!process.env.SECURITY_2FA_ENCRYPTION_KEY?.trim()) {
    issues.push({
      key: "SECURITY_2FA_ENCRYPTION_KEY",
      severity: "warn",
      message:
        "2FA encryption key not set — falling back to service role key (set dedicated key for production)",
    });
  }

  if (!process.env.NEWSROOM_SUPER_ADMIN_EMAILS?.trim()) {
    issues.push({
      key: "NEWSROOM_SUPER_ADMIN_EMAILS",
      severity: "warn",
      message: "No explicit super-admin email allowlist — using code default",
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

  return issues;
}

export function assertProductionEnvSafe(): void {
  const issues = validateProductionEnv();
  const errors = issues.filter((i) => i.severity === "error");
  if (errors.length > 0 && process.env.SECURITY_ENV_STRICT === "1") {
    throw new Error(
      `Production env validation failed:\n${errors.map((e) => `- ${e.message}`).join("\n")}`
    );
  }
}
