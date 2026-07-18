import { AdminPageGate } from "@/components/admin-newsroom/AdminPageGate";
import { AdminShell } from "@/components/admin-newsroom/AdminShell";
import { PlatformOverviewDashboard } from "@/sections/admin/PlatformOverviewDashboard";

export const dynamic = "force-dynamic";

export default function AdminTechnicalPage() {
  return (
    <AdminPageGate permission="monitoring:read">
      <AdminShell
        title="Platform health"
        subtitle="Developer and operations — queues, providers, and incidents."
      >
        <PlatformOverviewDashboard />
      </AdminShell>
    </AdminPageGate>
  );
}
