/** Pure rules for the moderation console, mirroring what the server enforces (the server remains the authority). */

export type ModDecision = "approve" | "reject" | "request_edit" | "hold" | "block" | "unpublish" | "confirm_district";

export const REASON_REQUIRED: ReadonlySet<ModDecision> = new Set(["reject", "block", "request_edit", "unpublish"]);

export type QueueFlag = { code: string; severity: "block" | "review" | "info" };

export function hasBlockingFlag(flags: QueueFlag[]): boolean {
  return flags.some((f) => f.severity === "block");
}

export function hasReviewFlag(flags: QueueFlag[]): boolean {
  return flags.some((f) => f.severity === "review" || f.severity === "block");
}

/** The decisions a moderator may take from each status. Anything else is hidden, not just disabled. */
export function allowedDecisions(status: string): ModDecision[] {
  switch (status) {
    case "submitted":
    case "under_review":
      return ["approve", "request_edit", "hold", "reject", "block", "confirm_district"];
    case "approved":
      // Already approved but not yet public (publication failed or is pending): the server only lets a story under review be approved.
      return ["reject", "block"];
    case "published":
      return ["unpublish"];
    default:
      return [];
  }
}

export type DecisionCheck = { ok: true } | { ok: false; reason: string };

/** Client-side readiness for a decision, so the button explains itself instead of failing after a round trip. */
export function checkDecision(input: { decision: ModDecision; reasonText: string; flags: QueueFlag[]; acknowledged: boolean; confirmedDistrict: string | null }): DecisionCheck {
  const reason = input.reasonText.trim();
  if (REASON_REQUIRED.has(input.decision) && reason.length < 5) return { ok: false, reason: "A written reason is required for this decision." };
  if (input.decision === "approve") {
    if (hasBlockingFlag(input.flags)) return { ok: false, reason: "This story carries a blocking flag and cannot be approved." };
    if (hasReviewFlag(input.flags) && !input.acknowledged) return { ok: false, reason: "Acknowledge the review flags before approving." };
  }
  // A moderator can only confirm the district the author declared; the server rejects anything else.
  if (input.decision === "confirm_district" && !input.confirmedDistrict) return { ok: false, reason: "The author declared no district, so there is nothing to confirm." };
  return { ok: true };
}

export function requestBody(input: { decision: ModDecision; reasonText: string; acknowledged: boolean; confirmedDistrict: string | null }): Record<string, unknown> {
  const body: Record<string, unknown> = { decision: input.decision };
  const reason = input.reasonText.trim();
  if (reason) body.reasonText = reason;
  if (input.decision === "approve" && input.acknowledged) body.acknowledgeFlags = true;
  if (input.decision === "confirm_district" && input.confirmedDistrict) body.confirmDistrict = input.confirmedDistrict;
  return body;
}
