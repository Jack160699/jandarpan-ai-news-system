import { AdminPageGate } from "@/components/admin-newsroom/AdminPageGate";
import { AdminShell } from "@/components/admin-newsroom/AdminShell";
import { IntelligenceMissionPanel } from "@/sections/admin/IntelligenceMissionPanel";

export const dynamic = "force-dynamic";

export default function AdminIntelligencePage() {
  return (
    <AdminPageGate permission="analytics:read">
      <AdminShell
        title="AI Intelligence"
        subtitle="Fake news risk, trust, duplicates, trends, viral prediction, and multilingual pipeline."
      >
        <IntelligenceMissionPanel />
      </AdminShell>
    </AdminPageGate>
  );
}
