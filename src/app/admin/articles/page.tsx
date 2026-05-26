import { AdminPageGate } from "@/components/admin-newsroom/AdminPageGate";
import { AdminShell } from "@/components/admin-newsroom/AdminShell";
import { PlatformArticlesPanel } from "@/components/admin-newsroom/PlatformAdminPanels";

export const dynamic = "force-dynamic";

export default function AdminArticlesPage() {
  return (
    <AdminPageGate permission="content:read">
      <AdminShell
        title="Articles"
        subtitle="Platform article corpus — mock data until Supabase sync."
      >
        <PlatformArticlesPanel />
      </AdminShell>
    </AdminPageGate>
  );
}
