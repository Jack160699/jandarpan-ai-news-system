import { AdminPageGate } from "@/components/admin-newsroom/AdminPageGate";
import { AdminShell } from "@/components/admin-newsroom/AdminShell";
import { ExecutiveCfoPanel } from "@/sections/admin/ExecutiveCfoPanel";
import "@/styles/executive-cfo.css";

export const dynamic = "force-dynamic";

export default function AdminExecutivePage() {
  return (
    <AdminPageGate permission="monitoring:read">
      <AdminShell
        title="Executive AI CFO"
        subtitle="CEO/CFO command center — AI spend, profitability, forecasts, and optimization."
      >
        <ExecutiveCfoPanel />
      </AdminShell>
    </AdminPageGate>
  );
}
