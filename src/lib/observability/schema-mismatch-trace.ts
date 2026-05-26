/**
 * Schema mismatch tracing (DB migrations out of sync).
 * Enable: NEXT_PUBLIC_ADMIN_DEBUG=1 or ADMIN_DEBUG=1
 */

const seen = new Set<string>();

function enabled(): boolean {
  return (
    process.env.NODE_ENV !== "production" ||
    process.env.ADMIN_DEBUG === "1" ||
    process.env.NEXT_PUBLIC_ADMIN_DEBUG === "1"
  );
}

export function traceSchemaMismatch(
  detail: string,
  extra?: Record<string, unknown>
): void {
  if (!enabled()) return;
  const key = `${detail}:${extra ? JSON.stringify(extra) : ""}`;
  if (seen.has(key)) return;
  seen.add(key);
  const payload = extra ? ` ${JSON.stringify(extra)}` : "";
  console.warn("[SCHEMA_MISMATCH]", `${detail}${payload}`);
}

export function isMissingColumnError(
  message: string | undefined | null,
  column: string
): boolean {
  if (!message) return false;
  const m = message.toLowerCase();
  return (
    m.includes("does not exist") &&
    (m.includes(`.${column.toLowerCase()}`) || m.includes(` ${column.toLowerCase()} `))
  );
}

