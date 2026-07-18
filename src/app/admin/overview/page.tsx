import { AdminPageGate } from "@/components/admin-newsroom/AdminPageGate";
import { AdminShell } from "@/components/admin-newsroom/AdminShell";
import { CommandCentre } from "@/sections/admin/CommandCentre";

export const dynamic = "force-dynamic";

export default function AdminOverviewPage() {
  return (
    <AdminPageGate permission="analytics:read">
      <AdminShell
        title="Command centre"
        subtitle="What needs your attention today."
      >
        <CommandCentre />
      </AdminShell>
    </AdminPageGate>
  );
}
