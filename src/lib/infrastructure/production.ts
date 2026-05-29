/**
 * Production deployment guards — Vercel / public traffic
 */

export function isProductionDeployment(): boolean {
  return (
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL_ENV === "production"
  );
}

/** Vercel cron + public ops endpoints — never middleware-404 in production */
export function isCronPath(pathname: string): boolean {
  return pathname === "/api/cron" || pathname.startsWith("/api/cron/");
}

export function isProductionExemptPath(pathname: string): boolean {
  if (isCronPath(pathname)) return true;
  if (pathname === "/api/health") return true;
  // Emergency authenticated diagnostics (cron-secret protected)
  if (pathname === "/api/debug/env") return true;
  if (pathname === "/api/debug/cron") return true;
  if (pathname === "/api/debug/ingestion") return true;
  if (pathname === "/api/debug/workers") return true;
  if (pathname === "/robots.txt") return true;
  if (pathname === "/sitemap.xml" || pathname === "/news-sitemap.xml") return true;
  return false;
}

export function isDebugPath(pathname: string): boolean {
  if (isProductionExemptPath(pathname)) return false;
  return (
    pathname === "/debug" ||
    pathname.startsWith("/debug/") ||
    pathname === "/api/debug" ||
    pathname.startsWith("/api/debug/")
  );
}

export function isSensitiveDevApiPath(pathname: string): boolean {
  if (isProductionExemptPath(pathname)) return false;
  if (!pathname.startsWith("/api/")) return false;
  const blocked = [
    "/api/debug",
    "/api/e2e",
    "/api/monetization/seed",
    "/api/dashboard/seed-membership",
    "/api/admin/tenants/seed",
    "/api/debug/run-newsroom-cycle",
  ];
  return blocked.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export type ProductionEnvCheck = {
  key: string;
  required: boolean;
  present: boolean;
};

const REQUIRED_PRODUCTION_ENV = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "CRON_SECRET",
  "NEXT_PUBLIC_SITE_URL",
] as const;

const RECOMMENDED_PRODUCTION_ENV = [
  "OPENAI_API_KEY",
  "GNEWS_API_KEY",
  "NEWSDATA_API_KEY",
  "NEWSROOM_CLUSTER_EVENTS",
] as const;

export function getProductionEnvChecks(): {
  required: ProductionEnvCheck[];
  recommended: ProductionEnvCheck[];
  ready: boolean;
  warnings: string[];
} {
  const required = REQUIRED_PRODUCTION_ENV.map((key) => ({
    key,
    required: true,
    present: Boolean(process.env[key]?.trim()),
  }));

  const recommended = RECOMMENDED_PRODUCTION_ENV.map((key) => ({
    key,
    required: false,
    present: Boolean(process.env[key]?.trim()),
  }));

  const warnings: string[] = [];

  if (isProductionDeployment()) {
    if (!process.env.CRON_SECRET?.trim()) {
      warnings.push("CRON_SECRET is required in production");
    }
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
      !process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
    ) {
      warnings.push(
        "Supabase auth is required — /admin uses session cookies in production"
      );
    }
    for (const key of Object.keys(process.env)) {
      if (!key.startsWith("NEXT_PUBLIC_")) continue;
      const upper = key.toUpperCase();
      if (
        upper.includes("SERVICE_ROLE") ||
        upper.includes("CRON_SECRET") ||
        upper.includes("OPENAI") ||
        upper.includes("ADMIN_SECRET")
      ) {
        warnings.push(`Remove leaked public env: ${key}`);
      }
    }
    if (
      process.env.NEWSROOM_CLUSTER_EVENTS !== "true" &&
      process.env.OPENAI_API_KEY?.trim()
    ) {
      warnings.push(
        "Set NEWSROOM_CLUSTER_EVENTS=true for AI homepage pipeline"
      );
    }
  }

  const ready = required.every((c) => c.present);

  return { required, recommended, ready, warnings };
}
