/**
 * Cron / worker route authentication
 */

export function parseBearerToken(authorization: string | null): string | null {
  if (!authorization) return null;
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

export function verifyCronRequest(request: Request): {
  authorized: boolean;
  bearerToken: string | null;
  cronHeader: string | null;
} {
  const cronSecret = process.env.CRON_SECRET?.trim() || null;
  const bearerToken = parseBearerToken(request.headers.get("authorization"));
  const cronHeader = request.headers.get("x-cron-secret")?.trim() ?? null;

  if (cronSecret && (bearerToken === cronSecret || cronHeader === cronSecret)) {
    return { authorized: true, bearerToken, cronHeader };
  }

  if (process.env.NODE_ENV === "development") {
    const url = new URL(request.url);
    if (url.searchParams.get("dev") === "1") {
      return { authorized: true, bearerToken, cronHeader };
    }
    if (!cronSecret) {
      return { authorized: true, bearerToken, cronHeader };
    }
  }

  return { authorized: false, bearerToken, cronHeader };
}
