/**
 * Autonomous SEO Engine — structured logging
 */

import { pipelineLog } from "@/lib/observability/production-log";

export function logAutonomous(
  event: string,
  data?: Record<string, unknown>
): void {
  pipelineLog("[seo_autonomous]", { event, ...data, ts: new Date().toISOString() });
}

export function errorAutonomous(
  event: string,
  data?: Record<string, unknown>
): void {
  pipelineLog("[seo_autonomous_error]", { event, ...data, ts: new Date().toISOString() });
}
