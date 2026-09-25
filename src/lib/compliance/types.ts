/**
 * Pure Compliance Types & Client-Safe SLA Calculations
 * Safe to import in both Server Components and Client Components ("use client").
 * Free of any server/database/cookie dependencies.
 */

export type GrievanceChannel = "web" | "whatsapp" | "email";

export type GrievanceStatus =
  | "RECEIVED"
  | "ACKNOWLEDGED"
  | "UNDER_REVIEW"
  | "ACTION_REQUIRED"
  | "RESOLVED"
  | "REJECTED_WITH_REASON"
  | "ESCALATED_LEVEL_II"
  | "ESCALATED_LEVEL_III";

export type GrievanceSubmissionInput = {
  channel: GrievanceChannel;
  complainantName: string;
  complainantEmail?: string;
  complainantPhone?: string;
  articleUrl?: string;
  articleHeadline?: string;
  publicationDate?: string;
  natureOfGrievance: string;
  groundsOfGrievance: string;
  codeOfEthicsClause?: string;
  supportingInfo?: string;
  consentGiven: boolean;
};

export type SlaStatusInfo = {
  daysOpen: number;
  hoursRemainingTo15d: number;
  isOverdue: boolean;
  alertTier: "NORMAL" | "DAY_7" | "DAY_10" | "DAY_12" | "DAY_14_CRITICAL" | "DAY_15_EXCEEDED";
  slaSeverity: "green" | "yellow" | "orange" | "red";
  slaMessage: string;
};

/**
 * Calculates 15-day resolution SLA clock according to IT Rules 2021, Rule 11.
 * Pure logic safe for client rendering and tests.
 */
export function calculateGrievanceSla(receivedAt: string | Date, status: GrievanceStatus): SlaStatusInfo {
  const received = new Date(receivedAt);
  const now = new Date();
  const diffMs = now.getTime() - received.getTime();
  const daysOpen = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const deadlineMs = received.getTime() + 15 * 24 * 60 * 60 * 1000;
  const hoursRemainingTo15d = Math.round((deadlineMs - now.getTime()) / (1000 * 60 * 60));
  const isResolved = status === "RESOLVED" || status === "REJECTED_WITH_REASON";

  if (isResolved) {
    return {
      daysOpen,
      hoursRemainingTo15d: Math.max(0, hoursRemainingTo15d),
      isOverdue: false,
      alertTier: "NORMAL",
      slaSeverity: "green",
      slaMessage: "Resolved within statutory protocol",
    };
  }

  if (daysOpen >= 15 || hoursRemainingTo15d <= 0) {
    return {
      daysOpen,
      hoursRemainingTo15d,
      isOverdue: true,
      alertTier: "DAY_15_EXCEEDED",
      slaSeverity: "red",
      slaMessage: `CRITICAL SLA VIOLATION: Exceeded 15-day statutory resolution period by ${Math.abs(Math.round(hoursRemainingTo15d / 24))} days`,
    };
  }

  if (daysOpen >= 14) {
    return {
      daysOpen,
      hoursRemainingTo15d,
      isOverdue: false,
      alertTier: "DAY_14_CRITICAL",
      slaSeverity: "red",
      slaMessage: `IMMEDIATE ACTION REQUIRED: Final 24 hours of statutory 15-day SLA (${hoursRemainingTo15d}h remaining)`,
    };
  }

  if (daysOpen >= 12) {
    return {
      daysOpen,
      hoursRemainingTo15d,
      isOverdue: false,
      alertTier: "DAY_12",
      slaSeverity: "orange",
      slaMessage: `HIGH ALERT: Day 12 of 15-day SLA (${hoursRemainingTo15d}h remaining)`,
    };
  }

  if (daysOpen >= 10) {
    return {
      daysOpen,
      hoursRemainingTo15d,
      isOverdue: false,
      alertTier: "DAY_10",
      slaSeverity: "yellow",
      slaMessage: `WARNING: Day 10 of 15-day SLA approaching resolution deadline`,
    };
  }

  if (daysOpen >= 7) {
    return {
      daysOpen,
      hoursRemainingTo15d,
      isOverdue: false,
      alertTier: "DAY_7",
      slaSeverity: "yellow",
      slaMessage: `MIDPOINT NOTICE: Day 7 of 15-day SLA — review notes required`,
    };
  }

  return {
    daysOpen,
    hoursRemainingTo15d,
    isOverdue: false,
    alertTier: "NORMAL",
    slaSeverity: "green",
    slaMessage: `Active review (${daysOpen} days open, ${hoursRemainingTo15d}h remaining)`,
  };
}
