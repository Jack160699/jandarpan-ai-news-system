import { AdminPageGate } from "@/components/admin-newsroom/AdminPageGate";
import { AdminShell } from "@/components/admin-newsroom/AdminShell";
import { PlatformDistrictsPanel } from "@/components/admin-newsroom/PlatformAdminPanels";

export const dynamic = "force-dynamic";

export default function AdminDistrictsPage() {
  return (
    <AdminPageGate permission="content:read">
      <AdminShell
        title="Districts"
        subtitle="District hubs, analytics, editors, homepage config — Supabase platform_districts."
      >
        <PlatformDistrictsPanel />
      </AdminShell>
    </AdminPageGate>
  );
}
