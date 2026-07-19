import { AdminPageGate } from "@/components/admin-newsroom/AdminPageGate";
import { AdminShell } from "@/components/admin-newsroom/AdminShell";
import { ExecutiveCostDashboard } from "@/sections/admin/ExecutiveCostDashboard";

export const dynamic = "force-dynamic";

export default function AdminExecutivePage() {
  return (
    <AdminPageGate permission="billing:read">
      <AdminShell
        title="Costs & AI spend"
        subtitle="Spend, budget, forecast, and expensive runs — one operating view."
      >
        <ExecutiveCostDashboard />
      </AdminShell>
    </AdminPageGate>
  );
}
