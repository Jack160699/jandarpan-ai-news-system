/**
 * Sentry integration — optional when SENTRY_DSN is configured
 */

import { opsLogger } from "@/lib/observability/logger";

let initAttempted = false;
let sentryReady = false;

export function isSentryEnabled(): boolean {
  return Boolean(process.env.SENTRY_DSN?.trim() || process.env.NEXT_PUBLIC_SENTRY_DSN?.trim());
}

export async function initSentryServer(): Promise<void> {
  if (initAttempted || !isSentryEnabled()) return;
  initAttempted = true;

  try {
    const Sentry = await import("@sentry/nextjs");
    Sentry.init({
      dsn: process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN,
      environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development",
      tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
      enabled: process.env.NODE_ENV === "production" || process.env.SENTRY_ENABLED === "true",
    });
    sentryReady = true;
    opsLogger.info("sentry_initialized");
  } catch (err) {
    opsLogger.warn("sentry_init_skipped", { err });
  }
}

export async function captureOpsException(
  error: unknown,
  context?: Record<string, unknown>
): Promise<void> {
  if (!isSentryEnabled()) return;

  try {
    await initSentryServer();
    if (!sentryReady) return;
    const Sentry = await import("@sentry/nextjs");
    Sentry.captureException(error, { extra: context });
  } catch {
    /* non-fatal */
  }
}

export function sentryReadyState(): boolean {
  return sentryReady;
}
