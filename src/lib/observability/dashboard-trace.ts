/**
 * Editorial dashboard fetch / poll tracing.
 * Enable: NEXT_PUBLIC_ADMIN_DEBUG=1 or ADMIN_DEBUG=1
 */

export type DashboardTraceTag =
  | "DASHBOARD_POLL"
  | "DASHBOARD_SKIP_INFLIGHT"
  | "DASHBOARD_SKIP_HIDDEN"
  | "DASHBOARD_CACHE_HIT"
  | "DASHBOARD_SKIP_THROTTLE"
  | "DASHBOARD_FETCH";

function enabled(): boolean {
  return (
    process.env.NODE_ENV !== "production" ||
    process.env.ADMIN_DEBUG === "1" ||
    process.env.NEXT_PUBLIC_ADMIN_DEBUG === "1"
  );
}

export function traceDashboard(
  tag: DashboardTraceTag,
  detail?: string,
  extra?: Record<string, unknown>
): void {
  if (!enabled()) return;
  const payload = extra ? ` ${JSON.stringify(extra)}` : "";
  const msg = detail ? `${detail}${payload}` : payload.trim() || "";
  console.log(`[${tag}]`, msg);
}
