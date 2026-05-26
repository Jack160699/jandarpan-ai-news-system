import { AdminPageGate } from "@/components/admin-newsroom/AdminPageGate";
import { AdminShell } from "@/components/admin-newsroom/AdminShell";
import { PlatformSectionsPanel } from "@/components/admin-newsroom/PlatformAdminPanels";

export const dynamic = "force-dynamic";

export default function AdminSettingsPage() {
  return (
    <AdminPageGate permission="editorial:write">
      <AdminShell
        title="Platform settings"
        subtitle="Homepage sections and newsroom configuration — stored in Supabase platform_config."
      >
        <PlatformSectionsPanel />
      </AdminShell>
    </AdminPageGate>
  );
}
