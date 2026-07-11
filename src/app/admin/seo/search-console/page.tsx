import { AdminPageGate } from "@/components/admin-newsroom/AdminPageGate";
import { AdminShell } from "@/components/admin-newsroom/AdminShell";
import { GscIntelligencePanel } from "@/sections/admin/GscIntelligencePanel";

export const dynamic = "force-dynamic";

export default function AdminGscIntelligencePage() {
  return (
    <AdminPageGate permission="analytics:read">
      <AdminShell
        title="Search Console"
        subtitle="Google Search Console performance, query intelligence, index health, and CTR opportunities."
      >
        <GscIntelligencePanel />
      </AdminShell>
    </AdminPageGate>
  );
}
