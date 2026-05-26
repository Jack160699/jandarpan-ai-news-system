import { AdminPageGate } from "@/components/admin-newsroom/AdminPageGate";
import { AdminShell } from "@/components/admin-newsroom/AdminShell";
import { LiveWirePanel } from "@/sections/admin/LiveWirePanel";

export const dynamic = "force-dynamic";

export default function AdminLiveWirePage() {
  return (
    <AdminPageGate permission="content:read">
      <AdminShell
        title="Live wire"
        subtitle="Breaking signals and real-time editorial alerts."
      >
        <LiveWirePanel />
      </AdminShell>
    </AdminPageGate>
  );
}
