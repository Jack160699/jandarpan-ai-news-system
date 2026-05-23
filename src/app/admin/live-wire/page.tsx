import { AdminPageGate } from "@/components/admin-newsroom/AdminPageGate";
import { AdminShell } from "@/components/admin-newsroom/AdminShell";
import { LiveWirePanel } from "@/sections/admin/LiveWirePanel";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ key?: string }>;
};

export default function AdminLiveWirePage({ searchParams }: PageProps) {
  return (
    <AdminPageGate searchParams={searchParams}>
      <AdminShell
        title="Live wire"
        subtitle="Event clusters and fast-publish candidates."
      >
        <LiveWirePanel />
      </AdminShell>
    </AdminPageGate>
  );
}
