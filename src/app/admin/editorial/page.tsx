import { AdminPageGate } from "@/components/admin-newsroom/AdminPageGate";
import { AdminShell } from "@/components/admin-newsroom/AdminShell";
import { EditorialOverview } from "@/sections/admin/EditorialOverview";

export const dynamic = "force-dynamic";

export default function AdminEditorialPage() {
  return (
    <AdminPageGate permission="content:read">
      <AdminShell
        title="Editorial overview"
        subtitle="Supervise ingestion, queues, and breaking editorial flow."
      >
        <EditorialOverview />
      </AdminShell>
    </AdminPageGate>
  );
}
