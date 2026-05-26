/**
 * Admin runtime diagnostics — structured logs + debug flag.
 */

import { createLogger } from "@/lib/observability/logger";

const log = createLogger("admin-diagnostics");

export function isAdminDebugEnabled(): boolean {
  return (
    process.env.ADMIN_DEBUG === "1" ||
    process.env.NEXT_PUBLIC_ADMIN_DEBUG === "1" ||
    process.env.NODE_ENV === "development"
  );
}

export function logAdminQuery(
  label: string,
  extra?: Record<string, unknown> & { durationMs?: number; err?: unknown }
): void {
  log.info("admin_query", { label, ...extra });
}

export function logAdminApiTiming(
  route: string,
  method: string,
  status: number,
  durationMs: number
): void {
  log.info("admin_api_timing", { route, method, status, durationMs });
}
