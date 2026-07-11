/**
 * Next.js instrumentation — Sentry, env validation, infra startup checks
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { initSentryServer } = await import("@/lib/observability/sentry");
    await initSentryServer();

    const { assertProductionEnvSafe } = await import("@/lib/security/env-validation");
    assertProductionEnvSafe();

    const { getProductionEnvChecks } = await import("@/lib/infrastructure/production");
    const checks = getProductionEnvChecks();
    const siteUrl = checks.required.find((c) => c.key === "NEXT_PUBLIC_SITE_URL");

    if (siteUrl && !siteUrl.present) {
      const { logOpsEvent } = await import("@/lib/observability/ops-event");
      logOpsEvent({
        subsystem: "startup",
        operation: "env_validation",
        status: "degraded",
        errorCode: "NEXT_PUBLIC_SITE_URL_MISSING",
        metadata: {
          message:
            "NEXT_PUBLIC_SITE_URL is not set — canonical URLs and production readiness are degraded",
        },
      });
    }

    if (checks.warnings.length > 0) {
      const { logOpsEvent } = await import("@/lib/observability/ops-event");
      for (const warn of checks.warnings) {
        logOpsEvent({
          subsystem: "startup",
          operation: "env_warning",
          status: "degraded",
          metadata: { message: warn },
        });
      }
    }

    const { runStartupInfraChecks } = await import("@/lib/observability/startup-checks");
    runStartupInfraChecks();
  }
}
