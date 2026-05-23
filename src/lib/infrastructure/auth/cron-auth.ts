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
};

export function parseBearerToken(authorization: string | null): string | null {
  if (!authorization) return null;
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

export function verifyCronRequest(request: Request): CronAuthResult {
  const cronSecret = process.env.CRON_SECRET?.trim() || null;
  const bearerToken = parseBearerToken(request.headers.get("authorization"));
  const cronHeader = request.headers.get("x-cron-secret")?.trim() ?? null;
  const vercelCron = request.headers.get("x-vercel-cron") === "1";

  if (cronSecret && (bearerToken === cronSecret || cronHeader === cronSecret)) {
    return { authorized: true, bearerToken, cronHeader, vercelCron };
  }

  if (isProductionDeployment()) {
    return { authorized: false, bearerToken, cronHeader, vercelCron };
  }

  const url = new URL(request.url);
  if (url.searchParams.get("dev") === "1") {
    return { authorized: true, bearerToken, cronHeader, vercelCron };
  }
  if (!cronSecret) {
    return { authorized: true, bearerToken, cronHeader, vercelCron };
  }

  return { authorized: false, bearerToken, cronHeader, vercelCron };
}
