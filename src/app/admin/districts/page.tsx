import { AdminPageGate } from "@/components/admin-newsroom/AdminPageGate";
import { AdminShell } from "@/components/admin-newsroom/AdminShell";
import { PlatformDistrictsPanel } from "@/components/admin-newsroom/PlatformAdminPanels";

export const dynamic = "force-dynamic";

type PageProps = { searchParams: Promise<{ key?: string }> };

export default function AdminDistrictsPage({ searchParams }: PageProps) {
  return (
    <AdminPageGate searchParams={searchParams}>
      <AdminShell title="Districts" subtitle="Featured district wire configuration.">
        <PlatformDistrictsPanel />
      </AdminShell>
    </AdminPageGate>
  );
}
