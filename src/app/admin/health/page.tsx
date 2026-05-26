import { AdminPageGate } from "@/components/admin-newsroom/AdminPageGate";
import { AdminShell } from "@/components/admin-newsroom/AdminShell";
import { HealthOperationsPanel } from "@/sections/admin/HealthOperationsPanel";

export const dynamic = "force-dynamic";

export default function AdminHealthPage() {
  return (
    <AdminPageGate permission="monitoring:read">
      <AdminShell
        title="Platform health"
        subtitle="Observability, caching, cron workers, queues, and production stability."
      >
        <HealthOperationsPanel />
      </AdminShell>
    </AdminPageGate>
  );
}
