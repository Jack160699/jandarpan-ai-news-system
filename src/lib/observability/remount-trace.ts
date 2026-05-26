/**
 * Admin runtime remount / invalidation tracing.
 * Enable: NEXT_PUBLIC_ADMIN_DEBUG=1 or ADMIN_DEBUG=1
 */

export type RemountTag =
  | "ROOT_REMOUNT"
  | "LAYOUT_REMOUNT"
  | "PAGE_REMOUNT"
  | "QUERY_INVALIDATION"
  | "UPLOAD_TRIGGER"
  | "CACHE_RESET"
  | "AUTH_STATE_CHANGE"
  | "REALTIME_EVENT"
  | "ROUTER_NAVIGATION"
  | "EDITOR_RERENDER";

function enabled(): boolean {
  return (
    process.env.NODE_ENV !== "production" ||
    process.env.ADMIN_DEBUG === "1" ||
    process.env.NEXT_PUBLIC_ADMIN_DEBUG === "1"
  );
}

export function traceRemount(
  tag: RemountTag,
  detail: string,
  extra?: Record<string, unknown>
): void {
  if (!enabled()) return;
  const payload = extra ? ` ${JSON.stringify(extra)}` : "";
  console.log(`[${tag}]`, `${detail}${payload}`);
}
