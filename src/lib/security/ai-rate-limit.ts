/**
 * Rate limits for expensive editorial AI endpoints
 */

import { NextResponse } from "next/server";
import {
  checkRateLimit,
  rateLimitHeaders,
} from "@/lib/infrastructure/cache/rate-limit";
import type { DashboardSession } from "@/lib/saas-auth/types";

const AI_REQUESTS_PER_MINUTE = 20;
const AI_WINDOW_SEC = 60;

export async function checkEditorialAiRateLimit(
  session: DashboardSession,
  action: string
): Promise<{ allowed: true } | { allowed: false; response: NextResponse }> {
  const rate = await checkRateLimit({
    key: `ai:${action}:${session.membership.tenantId}:${session.userId}`,
    limit: AI_REQUESTS_PER_MINUTE,
    windowSec: AI_WINDOW_SEC,
  });

  if (!rate.allowed) {
    return {
      allowed: false,
      response: NextResponse.json(
        { ok: false, error: "rate_limit_exceeded" },
        {
          status: 429,
          headers: rateLimitHeaders(rate, AI_REQUESTS_PER_MINUTE),
        }
      ),
    };
  }

  return { allowed: true };
}
