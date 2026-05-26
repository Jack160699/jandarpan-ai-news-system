/**
 * Next.js instrumentation — production env validation on boot
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { assertProductionEnvSafe } = await import("@/lib/security/env-validation");
    assertProductionEnvSafe();
  }
}
