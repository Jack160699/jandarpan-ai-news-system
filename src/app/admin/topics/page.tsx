import { AdminPageGate } from "@/components/admin-newsroom/AdminPageGate";
import { AdminShell } from "@/components/admin-newsroom/AdminShell";
import { PlatformTopicsPanel } from "@/components/admin-newsroom/PlatformAdminPanels";

export const dynamic = "force-dynamic";

export default function AdminTopicsPage() {
  return (
    <AdminPageGate permission="content:read">
      <AdminShell
        title="Topics"
        subtitle="SEO topics, performance, trend analysis — Supabase platform_topics."
      >
        <PlatformTopicsPanel />
      </AdminShell>
    </AdminPageGate>
  );
}
