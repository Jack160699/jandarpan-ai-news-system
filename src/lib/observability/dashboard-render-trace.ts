/**
 * Dashboard render tracing (admin).
 * Enable: NEXT_PUBLIC_ADMIN_DEBUG=1 or ADMIN_DEBUG=1
 */

function enabled(): boolean {
  return (
    process.env.NODE_ENV !== "production" ||
    process.env.ADMIN_DEBUG === "1" ||
    process.env.NEXT_PUBLIC_ADMIN_DEBUG === "1"
  );
}

export type DashboardRenderTag =
  | "DASHBOARD_RENDER"
  | "WIDGET_RENDER"
  | "CHART_RENDER"
  | "CHART_DATA"
  | "WIDGET_ERROR";

export function traceDashboardRender(
  tag: DashboardRenderTag,
  detail: string,
  extra?: Record<string, unknown>
): void {
  if (!enabled()) return;
  const payload = extra ? ` ${JSON.stringify(extra)}` : "";
  console.log(`[${tag}]`, `${detail}${payload}`);
}

