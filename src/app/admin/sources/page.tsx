import { AdminPageGate } from "@/components/admin-newsroom/AdminPageGate";
import { AdminShell } from "@/components/admin-newsroom/AdminShell";
import { PlatformSectionsPanel, PlatformSourcesPanel } from "@/components/admin-newsroom/PlatformAdminPanels";

export const dynamic = "force-dynamic";

type PageProps = { searchParams: Promise<{ key?: string }> };

export default function AdminSourcesPage({ searchParams }: PageProps) {
  return (
    <AdminPageGate searchParams={searchParams}>
      <AdminShell
        title="Sources & sections"
        subtitle="Source manager and homepage section toggles."
      >
        <h2 className="anr-h2">Sources</h2>
        <PlatformSourcesPanel />
        <h2 className="anr-h2">Homepage sections</h2>
        <PlatformSectionsPanel />
      </AdminShell>
    </AdminPageGate>
  );
}
