/**
 * Sentry integration — optional when SENTRY_DSN is configured
 */

import { opsLogger } from "@/lib/observability/logger";

let initAttempted = false;
let sentryReady = false;

export function isSentryEnabled(): boolean {
  return Boolean(process.env.SENTRY_DSN?.trim() || process.env.NEXT_PUBLIC_SENTRY_DSN?.trim());
}

/** Release id for deploy correlation (Vercel git SHA or explicit SENTRY_RELEASE). */
export function getSentryRelease(): string | undefined {
  const explicit = process.env.SENTRY_RELEASE?.trim();
  if (explicit) return explicit;
  const sha = process.env.VERCEL_GIT_COMMIT_SHA?.trim();
  if (sha) return `jan-darpan@${sha.slice(0, 12)}`;
  return undefined;
}

function sentryCommonInit() {
  return {
    dsn: process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development",
    release: getSentryRelease(),
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
    enabled:
      isSentryEnabled() &&
      (process.env.NODE_ENV === "production" || process.env.SENTRY_ENABLED === "true"),
  };
}

export async function initSentryServer(): Promise<void> {
  if (initAttempted || !isSentryEnabled()) return;
  initAttempted = true;

  try {
    const Sentry = await import("@sentry/nextjs");
    Sentry.init(sentryCommonInit());
    sentryReady = true;
    opsLogger.info("sentry_initialized", {
      release: getSentryRelease() ?? null,
      environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    });
  } catch (err) {
    opsLogger.warn("sentry_init_skipped", { err });
  }
}

/** Safe test event — cron-authenticated ops only. */
export async function captureSentryTestEvent(
  context?: Record<string, unknown>
): Promise<boolean> {
  if (!isSentryEnabled()) return false;
  try {
    await initSentryServer();
    if (!sentryReady) return false;
    const Sentry = await import("@sentry/nextjs");
    Sentry.captureMessage("jan-darpan ops sentry test", {
      level: "info",
      tags: { subsystem: "ops", probe: "sentry_test" },
      extra: context,
    });
    await Sentry.flush(2000);
    return true;
  } catch {
    return false;
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
