import { AdminPageGate } from "@/components/admin-newsroom/AdminPageGate";
import { AdminShell } from "@/components/admin-newsroom/AdminShell";
import { VerifiedRatesDiagnosticsPanel } from "@/sections/admin/VerifiedRatesDiagnosticsPanel";

export const dynamic = "force-dynamic";

export default function AdminVerifiedRatesPage() {
  return (
    <AdminPageGate permission="monitoring:read">
      <AdminShell
        title="Verified rates"
        subtitle="History health, provider gates, snapshot diagnostics — no manual price entry."
      >
        <VerifiedRatesDiagnosticsPanel />
      </AdminShell>
    </AdminPageGate>
  );
}
