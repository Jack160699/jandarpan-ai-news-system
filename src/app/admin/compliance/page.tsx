import { Metadata } from "next";
import { createAdminServerClient } from "@/lib/supabase/admin";
import { ComplianceDashboardClient } from "@/components/admin-compliance/ComplianceDashboardClient";
import { runComplianceHealthCheck } from "@/lib/compliance/health-check";
import { getRule18CanonicalParticulars } from "@/lib/compliance/rule18";
import { NOINDEX_ROBOTS } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Compliance & Grievance Control Centre · Newsroom Admin",
  robots: NOINDEX_ROBOTS,
};

export default async function AdminCompliancePage() {
  const supabase = createAdminServerClient();

  const [{ data: grievances }, { data: reports }, healthCheck] = await Promise.all([
    supabase
      .from("compliance_grievances" as any)
      .select("*")
      .order("received_at", { ascending: false }),
    supabase
      .from("compliance_reports" as any)
      .select("*")
      .order("month", { ascending: false }),
    runComplianceHealthCheck(),
  ]);

  const rule18Data = getRule18CanonicalParticulars();

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <ComplianceDashboardClient
        initialGrievances={(grievances ?? []) as any[]}
        initialReports={(reports ?? []) as any[]}
        initialHealth={healthCheck}
        rule18Data={rule18Data}
      />
    </div>
  );
}
