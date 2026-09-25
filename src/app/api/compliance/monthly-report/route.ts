import { NextResponse } from "next/server";
import {
  generateOrUpdateMonthlyReport,
  approveAndPublishMonthlyReport,
  getPreviousMonthString,
} from "@/lib/compliance/monthly-report";
import { createAdminServerClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month");
  const supabase = createAdminServerClient();

  if (month) {
    const { data: report, error } = await supabase
      .from("compliance_reports" as any)
      .select("*")
      .eq("month", month)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, report });
  }

  // List all reports ordered by month descending
  const { data: reports, error } = await supabase
    .from("compliance_reports" as any)
    .select("id, month, period_start, period_end, status, generated_at, approved_at, published_at, metrics")
    .order("month", { ascending: false });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, reports });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const p = body as Record<string, any>;
  const action = p.action ?? "generate";
  const targetMonth = p.month || getPreviousMonthString();

  if (action === "generate") {
    const result = await generateOrUpdateMonthlyReport(targetMonth);
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
    }
    return NextResponse.json({ ok: true, report: result.report });
  }

  if (action === "approve_and_publish") {
    const approvedBy = (p.approvedBy ?? "Grievance Officer (Shriyansh Chandrakar)").trim();
    if (!approvedBy) {
      return NextResponse.json({ ok: false, error: "approver_name_required" }, { status: 400 });
    }

    const result = await approveAndPublishMonthlyReport(targetMonth, approvedBy);
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
    }
    return NextResponse.json({ ok: true, message: `Report for ${targetMonth} published successfully.` });
  }

  return NextResponse.json({ ok: false, error: "unknown_action" }, { status: 400 });
}
