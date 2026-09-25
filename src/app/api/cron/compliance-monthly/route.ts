import { NextResponse } from "next/server";
import {
  generateOrUpdateMonthlyReport,
  getPreviousMonthString,
} from "@/lib/compliance/monthly-report";
import { runComplianceHealthCheck } from "@/lib/compliance/health-check";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Monthly Statutory Compliance Cron Handler
 * Triggered at the beginning of each calendar month.
 * Automatically generates draft compliance disclosure for previous month
 * and verifies statutory health across all vectors.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  // Basic authorization check if CRON_SECRET is configured
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    const key = searchParams.get("key");
    if (key !== cronSecret) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
  }

  const previousMonth = getPreviousMonthString();
  const reportResult = await generateOrUpdateMonthlyReport(previousMonth);
  const healthReport = await runComplianceHealthCheck();

  return NextResponse.json({
    ok: true,
    scheduledAction: "monthly_compliance_report_drafted",
    reportingMonth: previousMonth,
    reportGenerated: reportResult.ok,
    approvalRequired: true,
    complianceStatus: healthReport.overallStatus,
    summary: healthReport.summary,
  });
}
