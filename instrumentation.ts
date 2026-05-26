/**
 * Next.js instrumentation — Sentry + ops bootstrap
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { initSentryServer } = await import("@/lib/observability/sentry");
    await initSentryServer();
  }
}
