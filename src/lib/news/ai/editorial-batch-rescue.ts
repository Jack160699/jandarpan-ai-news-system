import type { EditorialQualityReport } from "./editorial-guards";

export function isSafeBatchRescueCandidate(
  quality: EditorialQualityReport
): boolean {
  return quality.publish_allowed && !quality.hard_reject;
}
