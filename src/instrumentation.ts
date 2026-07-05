/**
 * Next.js instrumentation — production env validation on boot
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { assertProductionEnvSafe } = await import("@/lib/security/env-validation");
    assertProductionEnvSafe();

    const { getProductionEnvChecks } = await import("@/lib/infrastructure/production");
    const checks = getProductionEnvChecks();
    const siteUrl = checks.required.find((c) => c.key === "NEXT_PUBLIC_SITE_URL");

    if (siteUrl && !siteUrl.present) {
      console.warn(
        "[startup] NEXT_PUBLIC_SITE_URL is not set. Production readiness is degraded. " +
          "Set NEXT_PUBLIC_SITE_URL to your canonical site URL (e.g. https://jandarpan.com). " +
          "The application will continue running."
      );
    }

    if (checks.warnings.length > 0) {
      for (const warn of checks.warnings) {
        console.warn(`[startup] ${warn}`);
      }
    }
  }
}
