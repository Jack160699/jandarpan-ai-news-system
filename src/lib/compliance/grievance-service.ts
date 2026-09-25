/**
 * Jan Darpan Grievance Redressal Service (Rule 11 IT Rules, 2021)
 * Manages intake, unique reference generation, 24-hr acknowledgement, 15-day SLA calculations, and audit logging.
 */

import { createAdminServerClient, isSupabaseConfigured } from "@/lib/supabase";
import { CANONICAL_IDENTITY } from "./canonical-identity";
import type {
  GrievanceChannel,
  GrievanceStatus,
  GrievanceSubmissionInput,
  SlaStatusInfo,
} from "./types";

export {
  calculateGrievanceSla,
  type GrievanceChannel,
  type GrievanceStatus,
  type GrievanceSubmissionInput,
  type SlaStatusInfo,
} from "./types";

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
