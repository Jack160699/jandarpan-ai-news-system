/**
 * Cron / worker route authentication
 *
 * Vercel Cron (when CRON_SECRET is set) sends:
 *   Authorization: Bearer <CRON_SECRET>
 *   x-vercel-cron: 1
 */

import { isProductionDeployment } from "@/lib/infrastructure/production";

export type CronAuthResult = {
  authorized: boolean;
  bearerToken: string | null;
  cronHeader: string | null;
  vercelCron: boolean;
  expectedSecretEnv: string | null;
};

export function parseBearerToken(authorization: string | null): string | null {
  if (!authorization) return null;
  const raw = authorization.trim();

  // Common production misformats we want to be resilient to:
  // - "Bearer Bearer <token>"
  // - "Bearer: <token>"
  // - raw token without scheme
  const normalized = raw.replace(/^Bearer\s+/i, "").replace(/^Bearer\s+/i, "");
  const withoutColon = normalized.replace(/^:\s*/, "");
  const token = withoutColon.trim();
  return token.length > 0 ? token : null;
}

function getCronSecret(): { secret: string | null; env: string | null } {
  const candidates: Array<[string, string | undefined]> = [
    ["CRON_SECRET", process.env.CRON_SECRET],
    // Back-compat fallbacks (misnamed envs in older deployments)
    ["CRON_API_SECRET", process.env.CRON_API_SECRET],
    ["ADMIN_SECRET", process.env.ADMIN_SECRET],
    ["INTERNAL_API_KEY", process.env.INTERNAL_API_KEY],
    ["AUTH_SECRET", process.env.AUTH_SECRET],
    ["API_SECRET", process.env.API_SECRET],
  ];

  for (const [name, value] of candidates) {
    const trimmed = value?.trim();
    if (trimmed) return { secret: trimmed, env: name };
  }
  return { secret: null, env: null };
}

/**
 * Internal helper (server-only): resolves the active cron secret.
 * Prefer setting `CRON_SECRET`; fallbacks exist to keep older deployments running.
 */
export function getActiveCronSecret(): { secret: string | null; env: string | null } {
  return getCronSecret();
}

export function verifyCronRequest(request: Request): CronAuthResult {
  const { secret: cronSecret, env: expectedSecretEnv } = getCronSecret();
  const authHeader = request.headers.get("authorization");
  const bearerToken = parseBearerToken(authHeader);
  const cronHeader = request.headers.get("x-cron-secret")?.trim() ?? null;
  const vercelCron = request.headers.get("x-vercel-cron") === "1";

  if (cronSecret && (bearerToken === cronSecret || cronHeader === cronSecret)) {
    return {
      authorized: true,
      bearerToken,
      cronHeader,
      vercelCron,
      expectedSecretEnv,
    };
  }

  // Temporary emergency diagnostics: only log on auth failure.
  // Keep the shape stable for log scrapers.
  try {
    console.log({
      authHeader,
      expectedSecret: cronSecret,
      envLoaded: Boolean(cronSecret),
      expectedSecretEnv,
      bearerToken,
      cronHeader,
      vercelCron,
      path: new URL(request.url).pathname,
    });
  } catch {
    // ignore logging failures
  }

  if (isProductionDeployment()) {
    return {
      authorized: false,
      bearerToken,
      cronHeader,
      vercelCron,
      expectedSecretEnv,
    };
  }

  const url = new URL(request.url);
  if (url.searchParams.get("dev") === "1") {
    return {
      authorized: true,
      bearerToken,
      cronHeader,
      vercelCron,
      expectedSecretEnv,
    };
  }
  if (!cronSecret) {
    return {
      authorized: true,
      bearerToken,
      cronHeader,
      vercelCron,
      expectedSecretEnv,
    };
  }

  return {
    authorized: false,
    bearerToken,
    cronHeader,
    vercelCron,
    expectedSecretEnv,
  };
}
