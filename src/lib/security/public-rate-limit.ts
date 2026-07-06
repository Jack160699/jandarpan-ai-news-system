/**
 * IP-based rate limits for public POST/GET APIs
 */

import { NextResponse } from "next/server";
import { checkRateLimit, rateLimitHeaders } from "@/lib/infrastructure/cache/rate-limit";
import { getClientIp } from "@/lib/security/request-context";

export async function checkPublicApiRateLimit(
  request: Request,
  action: string,
  limit = 60,
  windowSec = 60
): Promise<{ allowed: true } | { allowed: false; response: NextResponse }> {
  const ip = getClientIp(request) ?? "unknown";
  const rate = await checkRateLimit({
    key: `public:${action}:${ip}`,
    limit,
    windowSec,
  });

  if (!rate.allowed) {
    return {
      allowed: false,
      response: NextResponse.json(
        { ok: false, error: "rate_limit_exceeded" },
        {
          status: 429,
          headers: rateLimitHeaders(rate, limit),
        }
      ),
    };
  }

  return { allowed: true };
}
