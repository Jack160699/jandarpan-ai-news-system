/**
 * Worker authentication.
 *
 * The function is deployed with JWT verification OFF (pg_cron/pg_net call it with a shared secret, not a user JWT),
 * so this check is the only gate. It accepts the dedicated EDGE_WORKER_SECRET, or - if that is not set - the existing
 * CRON_SCHEDULER_SECRET, compares in constant time and FAILS CLOSED when neither is configured.
 */

export type AuthResult =
  | { ok: true; via: "EDGE_WORKER_SECRET" | "CRON_SCHEDULER_SECRET" }
  | { ok: false; status: 401 | 503; reason: "missing_or_invalid_bearer" | "worker_secret_not_configured" };

/** Constant-time string equality (length is not secret here, content is). */
export function timingSafeEqualStrings(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const x = enc.encode(a);
  const y = enc.encode(b);
  let diff = x.length ^ y.length;
  const n = Math.max(x.length, y.length);
  for (let i = 0; i < n; i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

export function extractBearer(request: Request): string | null {
  const header = request.headers.get("authorization") ?? "";
  const m = /^Bearer\s+(.+)$/i.exec(header.trim());
  return m ? m[1]!.trim() : null;
}

export function authorizeWorkerRequest(
  request: Request,
  env: Record<string, string | undefined> = process.env
): AuthResult {
  const dedicated = env.EDGE_WORKER_SECRET?.trim();
  const scheduler = env.CRON_SCHEDULER_SECRET?.trim();
  if (!dedicated && !scheduler) {
    return { ok: false, status: 503, reason: "worker_secret_not_configured" };
  }
  const presented = extractBearer(request);
  if (!presented) return { ok: false, status: 401, reason: "missing_or_invalid_bearer" };
  // Evaluate both comparisons (no early exit) so timing does not reveal which secret matched.
  const okDedicated = dedicated ? timingSafeEqualStrings(presented, dedicated) : false;
  const okScheduler = scheduler ? timingSafeEqualStrings(presented, scheduler) : false;
  if (okDedicated) return { ok: true, via: "EDGE_WORKER_SECRET" };
  if (okScheduler) return { ok: true, via: "CRON_SCHEDULER_SECRET" };
  return { ok: false, status: 401, reason: "missing_or_invalid_bearer" };
}
