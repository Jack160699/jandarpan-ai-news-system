import { AdminPageGate } from "@/components/admin-newsroom/AdminPageGate";
import { AdminShell } from "@/components/admin-newsroom/AdminShell";
import { PlatformArticlesPanel } from "@/components/admin-newsroom/PlatformAdminPanels";

export const dynamic = "force-dynamic";

export default function AdminArticlesPage() {
  return (
    <AdminPageGate permission="content:read">
      <AdminShell
        title="Articles"
        subtitle="Unified generated_articles + platform_articles — search, filters, workflow, SEO, publish."
      >
        <PlatformArticlesPanel />
      </AdminShell>
    </AdminPageGate>
  );
}
