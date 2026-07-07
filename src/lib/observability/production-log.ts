/**
 * Gate verbose pipeline logs in production — keeps cron/ingest noise down.
 */

import { isProductionDeployment } from "@/lib/infrastructure/production";

export function isVerbosePipelineLogging(): boolean {
  if (!isProductionDeployment()) return true;
  return process.env.PIPELINE_VERBOSE_LOGS === "1";
}

export function pipelineLog(
  tag: string,
  payload?: Record<string, unknown> | string
): void {
  if (!isVerbosePipelineLogging()) return;
  if (typeof payload === "string") {
    console.log(tag, payload);
    return;
  }
  console.log(tag, payload ? JSON.stringify(payload) : "");
}

export function pipelineWarn(
  tag: string,
  payload?: Record<string, unknown>
): void {
  console.warn(tag, payload ? JSON.stringify(payload) : "");
}
