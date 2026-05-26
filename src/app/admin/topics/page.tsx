import { AdminPageGate } from "@/components/admin-newsroom/AdminPageGate";
import { AdminShell } from "@/components/admin-newsroom/AdminShell";
import { PlatformTopicsPanel } from "@/components/admin-newsroom/PlatformAdminPanels";

export const dynamic = "force-dynamic";

export default function AdminTopicsPage() {
  return (
    <AdminPageGate permission="content:read">
      <AdminShell title="Topics" subtitle="Topic clusters and editorial themes.">
        <PlatformTopicsPanel />
      </AdminShell>
    </AdminPageGate>
  );
}
