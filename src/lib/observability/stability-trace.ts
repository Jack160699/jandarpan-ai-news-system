type StabilityTag =
  | "RENDER_LOOP"
  | "AUTH_LOOP"
  | "ROUTER_REFRESH"
  | "SUBSCRIPTION_RECONNECT"
  | "SESSION_REFRESH"
  | "EDITOR_BOOT"
  | "EDITOR_CRASH";

function shouldTrace(): boolean {
  return (
    process.env.NODE_ENV !== "production" ||
    process.env.ADMIN_DEBUG === "1" ||
    process.env.NEXT_PUBLIC_ADMIN_DEBUG === "1"
  );
}

export function traceStability(
  tag: StabilityTag,
  detail: string,
  extra?: Record<string, unknown>
): void {
  if (!shouldTrace()) return;
  const payload = extra ? ` ${JSON.stringify(extra)}` : "";
  // Required format: [TAG]
  console.log(`[${tag}]`, `${detail}${payload}`);
}

