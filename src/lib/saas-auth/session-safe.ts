/**
 * Timed dashboard session resolution — never blocks admin boot indefinitely.
 */

import { GET_USER_TIMEOUT_MS } from "@/lib/auth/auth-safe";
import { traceAdminBoot, traceAdminTimeout } from "@/lib/observability/admin-boot";
import { getDashboardSession } from "@/lib/saas-auth/session";
import type { DashboardSession } from "@/lib/saas-auth/types";
import { isTimeoutError, withTimeout } from "@/lib/utils/withTimeout";

export type SessionLoadResult =
  | { ok: true; session: DashboardSession | null }
  | { ok: false; reason: "timeout" | "error"; message: string };

/** Workspace + tenant bootstrap budget */
const AUTH_INIT_TIMEOUT_MS = 8_000;
export { GET_USER_TIMEOUT_MS };

export async function getDashboardSessionSafe(
  request?: Request
): Promise<SessionLoadResult> {
  traceAdminBoot("AUTH_INIT", "start");

  try {
    const session = await withTimeout(getDashboardSession(request), {
      label: "AUTH_INIT",
      timeoutMs: AUTH_INIT_TIMEOUT_MS,
    });
    traceAdminBoot("AUTH_INIT", session ? "resolved" : "anonymous", {
      hasMembership: Boolean(session?.membership),
    });
    return { ok: true, session };
  } catch (err) {
    if (isTimeoutError(err)) {
      traceAdminTimeout("AUTH_INIT", AUTH_INIT_TIMEOUT_MS);
      return {
        ok: false,
        reason: "timeout",
        message: "Session verification timed out. Supabase may be slow or unreachable.",
      };
    }
    const message = err instanceof Error ? err.message : "session_load_failed";
    traceAdminBoot("AUTH_INIT", "error", { message });
    return { ok: false, reason: "error", message };
  }
}
