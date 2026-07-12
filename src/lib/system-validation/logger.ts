/**
 * System Validation — structured logging
 */

import { pipelineLog } from "@/lib/observability/production-log";

export function logValidation(
  event: string,
  data?: Record<string, unknown>
): void {
  pipelineLog("[system_validation]", { event, ...data, ts: new Date().toISOString() });
}
