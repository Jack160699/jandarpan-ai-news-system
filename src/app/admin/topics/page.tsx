import { AdminPageGate } from "@/components/admin-newsroom/AdminPageGate";
import { AdminShell } from "@/components/admin-newsroom/AdminShell";
import { PlatformTopicsPanel } from "@/components/admin-newsroom/PlatformAdminPanels";

export const dynamic = "force-dynamic";

type PageProps = { searchParams: Promise<{ key?: string }> };

export default function AdminTopicsPage({ searchParams }: PageProps) {
  return (
    <AdminPageGate searchParams={searchParams}>
      <AdminShell title="Topics" subtitle="SEO topic hubs and routing.">
        <PlatformTopicsPanel />
      </AdminShell>
    </AdminPageGate>
  );
}
