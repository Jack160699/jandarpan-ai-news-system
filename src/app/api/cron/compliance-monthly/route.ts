import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/infrastructure/auth/cron-auth";
import { cronAuthFailureResponse } from "@/lib/infrastructure/auth/cron-response";
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
  // Fail-closed, header-only, timing-safe. (This used to skip auth entirely when CRON_SECRET was unset and also accepted the
  // secret as a ?key= URL parameter, which ends up in access logs.)
  const auth = await verifyCronRequest(request, { capability: "ops" });
  if (!auth.authorized) return cronAuthFailureResponse(auth);

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
