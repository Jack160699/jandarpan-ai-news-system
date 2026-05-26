import { AdminPageGate } from "@/components/admin-newsroom/AdminPageGate";
import { AdminShell } from "@/components/admin-newsroom/AdminShell";
import { PlatformSourcesPanel } from "@/components/admin-newsroom/PlatformAdminPanels";

export const dynamic = "force-dynamic";

export default function AdminSourcesPage() {
  return (
    <AdminPageGate permission="providers:read">
      <AdminShell
        title="Sources"
        subtitle="RSS and provider health for the newsroom pipeline."
      >
        <PlatformSourcesPanel />
      </AdminShell>
    </AdminPageGate>
  );
}
