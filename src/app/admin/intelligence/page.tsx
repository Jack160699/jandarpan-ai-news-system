import { AdminPageGate } from "@/components/admin-newsroom/AdminPageGate";
import { AdminShell } from "@/components/admin-newsroom/AdminShell";
import { IntelligenceCenterPanel } from "@/sections/admin/IntelligenceCenterPanel";

export const dynamic = "force-dynamic";

export default function AdminIntelligencePage() {
  return (
    <AdminPageGate permission="analytics:read">
      <AdminShell
        title="Intelligence Center"
        subtitle="Event clustering, vector search, misinfo scoring, live signals, and AI newsroom recommendations."
      >
        <IntelligenceCenterPanel />
      </AdminShell>
    </AdminPageGate>
  );
}
