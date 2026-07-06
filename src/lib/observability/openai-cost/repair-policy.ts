/**
 * Editorial repair gate — only repair when a fixable quality defect exists
 */

import type { EditorialQualityReport } from "@/lib/news/ai/editorial-guards";

export type RepairDecision = {
  shouldRepair: boolean;
  reasons: string[];
  skipped: boolean;
};

export function shouldRunEditorialRepair(
  quality: EditorialQualityReport
): RepairDecision {
  if (quality.hard_reject) {
    return { shouldRepair: false, reasons: ["hard_reject"], skipped: true };
  }

  if (quality.publish_allowed) {
    return { shouldRepair: false, reasons: ["already_publishable"], skipped: true };
  }

  const reasons: string[] = [];

  if (quality.ai_confidence < quality.min_confidence_used) {
    reasons.push("confidence_below_threshold");
  }
  if (quality.rejectionReasons.includes("low_readability")) {
    reasons.push("grammar_readability_poor");
  }
  if (quality.rejectionReasons.includes("weak_headline")) {
    reasons.push("headline_invalid");
  }
  if (quality.rejectionReasons.includes("low_seo_quality")) {
    reasons.push("seo_missing");
  }

  const shouldRepair = reasons.length > 0;

  return {
    shouldRepair,
    reasons,
    skipped: !shouldRepair,
  };
}
