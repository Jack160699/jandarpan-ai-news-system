/**
 * Hydration safety tracing for admin shell.
 * Enable: NEXT_PUBLIC_ADMIN_DEBUG=1 or ADMIN_DEBUG=1
 */

function enabled(): boolean {
  return (
    process.env.NODE_ENV !== "production" ||
    process.env.ADMIN_DEBUG === "1" ||
    process.env.NEXT_PUBLIC_ADMIN_DEBUG === "1"
  );
}

export function traceHydrationSafe(scope: string): void {
  if (!enabled()) return;
  console.log("[HYDRATION_SAFE]", scope);
}
