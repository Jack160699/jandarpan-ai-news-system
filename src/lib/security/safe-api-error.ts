/**
 * Sanitize API error payloads — never leak stack traces or internal details to clients.
 */

import { isProductionDeployment } from "@/lib/infrastructure/production";

export function clientSafeErrorMessage(
  error: unknown,
  fallback = "internal_error"
): string {
  if (!isProductionDeployment()) {
    if (error instanceof Error && error.message.trim()) {
      return error.message;
    }
    if (typeof error === "string" && error.trim()) {
      return error;
    }
  }
  return fallback;
}
