import { AdminPageGate } from "@/components/admin-newsroom/AdminPageGate";
import { AdminShell } from "@/components/admin-newsroom/AdminShell";
import { CompetitorIntelligencePanel } from "@/sections/admin/CompetitorIntelligencePanel";

export const dynamic = "force-dynamic";

export default function AdminCompetitorSeoPage() {
  return (
    <AdminPageGate permission="analytics:read">
      <AdminShell
        title="Competitor Intelligence"
        subtitle="Read-only SEO and content intelligence from major Indian news competitors."
      >
        <CompetitorIntelligencePanel />
      </AdminShell>
    </AdminPageGate>
  );
}
