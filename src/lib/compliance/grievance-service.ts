/**
 * Jan Darpan Grievance Redressal Service (Rule 11 IT Rules, 2021)
 * Manages intake, unique reference generation, 24-hr acknowledgement, 15-day SLA calculations, and audit logging.
 */

import { createAdminServerClient, isSupabaseConfigured } from "@/lib/supabase";
import { CANONICAL_IDENTITY } from "./canonical-identity";

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

export function generateGrievanceId(yearMonth?: string, sequenceNumber: number = 1): string {
  const ym = yearMonth ?? new Date().toISOString().slice(0, 7).replace("-", "");
  const padded = String(sequenceNumber).padStart(4, "0");
  return `JD-GR-${ym}-${padded}`;
}

/**
 * Creates a grievance record in Supabase with auto-generated ID, 15-day SLA deadline,
 * and creates initial audit trail event and 24-hr acknowledgement text.
 */
export async function createGrievance(input: GrievanceSubmissionInput): Promise<{
  ok: boolean;
  grievanceId?: string;
  acknowledgementText?: string;
  error?: string;
}> {
  try {
    const ym = new Date().toISOString().slice(0, 7).replace("-", "");
    const grievanceId = generateGrievanceId(ym, 1);
    const ackText = `Your grievance has been received by Jan Darpan and has been registered for review under Rule 11 of the Information Technology Rules, 2021. Your grievance reference number is ${grievanceId}. Please retain this reference number for future correspondence. The Grievance Officer (Shriyansh Chandrakar) will complete review within the statutory 15-day period.`;

    if (!isSupabaseConfigured()) {
      return {
        ok: true,
        grievanceId,
        acknowledgementText: ackText,
      };
    }

    const supabase = createAdminServerClient();
    
    // Count existing grievances for the month to get the next sequential number
    const { count } = await (supabase as any)
      .from("compliance_grievances")
      .select("id", { count: "exact", head: true });

    const sequence = (count ?? 0) + 1;
    const finalGrievanceId = generateGrievanceId(ym, sequence);
    const now = new Date();
    const sla15dDeadline = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString();
    const finalAckText = `Your grievance has been received by Jan Darpan and has been registered for review under Rule 11 of the Information Technology Rules, 2021. Your grievance reference number is ${finalGrievanceId}. Please retain this reference number for future correspondence. The Grievance Officer (Shriyansh Chandrakar) will complete review within the statutory 15-day period.`;

    const row = {
      id: grievanceId,
      received_at: now.toISOString(),
      channel: input.channel,
      complainant_name: input.complainantName.trim(),
      complainant_email: input.complainantEmail?.trim() || null,
      complainant_phone: input.complainantPhone?.trim() || null,
      article_url: input.articleUrl?.trim() || null,
      article_headline: input.articleHeadline?.trim() || null,
      publication_date: input.publicationDate || null,
      nature_of_grievance: input.natureOfGrievance.trim(),
      grounds_of_grievance: input.groundsOfGrievance.trim(),
      code_of_ethics_clause: input.codeOfEthicsClause?.trim() || null,
      supporting_info: input.supportingInfo?.trim() || null,
      consent_given: Boolean(input.consentGiven),
      status: "ACKNOWLEDGED",
      assigned_reviewer: CANONICAL_IDENTITY.grievanceOfficer.name,
      sla_15d_deadline: sla15dDeadline,
      sla_acknowledged_24h: true,
      acknowledgement_sent_at: now.toISOString(),
      acknowledgement_channel: input.channel,
      acknowledgement_reference: `ACK-${grievanceId}`,
      escalation_level: "LEVEL_I",
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    };

    const { error: insertError } = await supabase
      .from("compliance_grievances" as any)
      .insert(row as any);

    if (insertError) {
      console.error("[compliance] grievance insert error:", insertError);
      return { ok: false, error: insertError.message };
    }

    // Log the event to audit log
    await supabase.from("compliance_grievance_events" as any).insert({
      grievance_id: grievanceId,
      event_type: "GRIEVANCE_REGISTERED_AND_ACKNOWLEDGED",
      actor: "system_intake",
      description: `Grievance registered via ${input.channel} channel and acknowledged within 24h statutory window.`,
      metadata: {
        channel: input.channel,
        acknowledged_at: now.toISOString(),
        complainant_name: input.complainantName,
        sla_15d_deadline: sla15dDeadline,
      },
    } as any);

    return {
      ok: true,
      grievanceId,
      acknowledgementText: ackText,
    };
  } catch (err: any) {
    console.error("[compliance] grievance service error:", err);
    return { ok: false, error: err.message ?? "Internal service error" };
  }
}
