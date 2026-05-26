/**
 * Production-safe Supabase auth — timeouts, no refresh recursion, graceful failures.
 */

import type { AuthError, Session, SupabaseClient, User } from "@supabase/supabase-js";
import { traceAdminBoot, traceAdminTimeout } from "@/lib/observability/admin-boot";
import { isTimeoutError, withTimeout, withTimeoutFallback } from "@/lib/utils/withTimeout";

const GET_USER_TIMEOUT_MS = 4_000;
const REFRESH_TIMEOUT_MS = 4_000;
const MAX_REFRESH_ATTEMPTS = 1;
/** Minimum interval between refreshSession calls (production hardening) */
const MIN_REFRESH_INTERVAL_MS = 10 * 60 * 1000;

let lastRefreshAt = 0;

export type SafeUserResult = {
  user: User | null;
  error: AuthError | null;
  timedOut: boolean;
};

export type SafeSessionResult = {
  session: Session | null;
  error: AuthError | null;
  timedOut: boolean;
};

export async function safeGetUser(
  client: Pick<SupabaseClient, "auth">,
  label = "AUTH_INIT"
): Promise<SafeUserResult> {
  traceAdminBoot("AUTH_INIT", `${label}_start`);

  try {
    const result = await withTimeout(client.auth.getUser(), {
      label,
      timeoutMs: GET_USER_TIMEOUT_MS,
    });
    traceAdminBoot("AUTH_INIT", result.data.user ? "user_ok" : "anonymous", {
      label,
    });
    return {
      user: result.data.user ?? null,
      error: result.error,
      timedOut: false,
    };
  } catch (err) {
    if (isTimeoutError(err)) {
      traceAdminTimeout(label, GET_USER_TIMEOUT_MS);
      return { user: null, error: null, timedOut: true };
    }
    const message = err instanceof Error ? err.message : "auth_get_user_failed";
    traceAdminBoot("AUTH_INIT", "error", { label, message });
    return {
      user: null,
      error: { message, name: "AuthError", status: 500 } as AuthError,
      timedOut: false,
    };
  }
}

let refreshInFlight: Promise<SafeSessionResult> | null = null;

/**
 * Refresh session at most once per process tick — prevents middleware/auth recursion.
 */
export async function safeRefreshSession(
  client: Pick<SupabaseClient, "auth">,
  label = "SESSION_REFRESH"
): Promise<SafeSessionResult> {
  const now = Date.now();
  if (now - lastRefreshAt < MIN_REFRESH_INTERVAL_MS) {
    traceAdminBoot("SESSION_REFRESH", "throttled", {
      label,
      nextInMs: MIN_REFRESH_INTERVAL_MS - (now - lastRefreshAt),
    });
    return safeGetSession(client, label);
  }

  if (refreshInFlight) {
    traceAdminBoot("SESSION_REFRESH", "dedupe_in_flight");
    return refreshInFlight;
  }

  traceAdminBoot("SESSION_REFRESH", `${label}_start`);

  refreshInFlight = (async () => {
    try {
      const result = await withTimeout(client.auth.refreshSession(), {
        label,
        timeoutMs: REFRESH_TIMEOUT_MS,
      });
      lastRefreshAt = Date.now();
      return {
        session: result.data.session ?? null,
        error: result.error,
        timedOut: false,
      };
    } catch (err) {
      if (isTimeoutError(err)) {
        traceAdminTimeout(label, REFRESH_TIMEOUT_MS);
        return { session: null, error: null, timedOut: true };
      }
      const message =
        err instanceof Error ? err.message : "auth_refresh_failed";
      return {
        session: null,
        error: { message, name: "AuthError", status: 500 } as AuthError,
        timedOut: false,
      };
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

export async function safeGetSession(
  client: Pick<SupabaseClient, "auth">,
  label = "AUTH_INIT"
): Promise<SafeSessionResult> {
  return withTimeoutFallback(
    client.auth.getSession().then((r) => ({
      session: r.data.session ?? null,
      error: r.error,
      timedOut: false,
    })),
    { session: null, error: null, timedOut: true },
    { label, timeoutMs: GET_USER_TIMEOUT_MS }
  );
}

/** Clear legacy dashboard cookies when token is invalid (browser must call API). */
export function staleAuthCookieHints(): string[] {
  return ["nr-dashboard-access", "nr-dashboard-refresh"];
}

export {
  MAX_REFRESH_ATTEMPTS,
  GET_USER_TIMEOUT_MS,
  MIN_REFRESH_INTERVAL_MS,
};
