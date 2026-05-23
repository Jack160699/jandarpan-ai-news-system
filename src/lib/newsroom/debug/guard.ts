/**
 * Dev-only guards for newsroom debug endpoints and pages.
 */

import { isProductionDeployment } from "@/lib/infrastructure/production";

export function isDevNewsroomDebugAllowed(): boolean {
  return !isProductionDeployment();
}

export function assertDevNewsroomDebug(): void {
  if (!isDevNewsroomDebugAllowed()) {
    throw new Error("Newsroom debug tools are disabled in production");
  }
}
