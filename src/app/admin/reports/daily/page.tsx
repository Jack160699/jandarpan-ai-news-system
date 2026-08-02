import { Suspense } from "react";
import { AdminPageGate } from "@/components/admin-newsroom/AdminPageGate";
import { AdminShell } from "@/components/admin-newsroom/AdminShell";
import { NewsroomDailyReportPanel } from "@/sections/admin/NewsroomDailyReportPanel";

export const dynamic = "force-dynamic";

export default function AdminDailyNewsroomReportPage() {
  return (
    <AdminPageGate permission="monitoring:read">
      <AdminShell
        title="Daily newsroom audit"
        subtitle="Deterministic production metrics + AI executive summary for one IST calendar day."
      >
        <Suspense fallback={<p className="text-sm text-zinc-400">Loading report…</p>}>
          <NewsroomDailyReportPanel />
        </Suspense>
      </AdminShell>
    </AdminPageGate>
  );
}
