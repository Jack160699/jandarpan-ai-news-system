import { NextResponse } from "next/server";
import { createAdminServerClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const p = body as Record<string, any>;
  const grievanceId = (p.grievanceId ?? "").trim();
  const decision = (p.decision ?? "").trim();
  const decisionNotes = (p.decisionNotes ?? "").trim();
  const reviewer = (p.reviewer ?? "Shriyansh Chandrakar").trim();

  if (!grievanceId || !decision || !decisionNotes) {
    return NextResponse.json(
      { ok: false, error: "grievanceId, decision, and decisionNotes are required" },
      { status: 400 }
    );
  }

  const supabase = createAdminServerClient();
  const now = new Date().toISOString();

  const { error: updateError } = await supabase
    .from("compliance_grievances" as any)
    .update({
      status: decision,
      decision,
      decision_notes: decisionNotes,
      assigned_reviewer: reviewer,
      decision_at: now,
      response_sent_at: now,
      updated_at: now,
    } as any)
    .eq("id", grievanceId);

  if (updateError) {
    return NextResponse.json({ ok: false, error: updateError.message }, { status: 500 });
  }

  // Record audit log event
  await supabase.from("compliance_grievance_events" as any).insert({
    grievance_id: grievanceId,
    event_type: "DECISION_RECORDED",
    actor: reviewer,
    description: `Statutory decision recorded by ${reviewer}: ${decision}`,
    metadata: {
      decision,
      decisionNotes,
      timestamp: now,
    },
  } as any);

  return NextResponse.json({ ok: true, message: "Decision recorded successfully." });
}
