/**
 * Admin initialization tracing — console phases for runtime debugging.
 */

export type AdminBootPhase =
  | "ADMIN_BOOT"
  | "AUTH_INIT"
  | "TEAM_LOAD"
  | "WORKSPACE_LOAD"
  | "TIMEOUT"
  | "RECOVERY_MODE";

function shouldTrace(): boolean {
  return (
    process.env.NODE_ENV !== "production" ||
    process.env.ADMIN_DEBUG === "1" ||
    process.env.NEXT_PUBLIC_ADMIN_DEBUG === "1"
  );
}

export function traceAdminBoot(
  phase: AdminBootPhase,
  detail?: string,
  extra?: Record<string, unknown>
): void {
  if (!shouldTrace()) return;
  const payload = extra ? ` ${JSON.stringify(extra)}` : "";
  const msg = detail ? `${phase} ${detail}${payload}` : phase;
  console.log(`[${phase}]`, msg);
}

export function traceAdminTimeout(
  label: string,
  timeoutMs: number,
  extra?: Record<string, unknown>
): void {
  traceAdminBoot("TIMEOUT", label, { timeoutMs, ...extra });
}

export function traceAdminRecovery(
  reason: string,
  extra?: Record<string, unknown>
): void {
  traceAdminBoot("RECOVERY_MODE", reason, extra);
}
