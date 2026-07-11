import { AdminPageGate } from "@/components/admin-newsroom/AdminPageGate";
import { AdminShell } from "@/components/admin-newsroom/AdminShell";
import { SeoIntelligencePanel } from "@/sections/admin/SeoIntelligencePanel";

export const dynamic = "force-dynamic";

export default function AdminSeoIntelligencePage() {
  return (
    <AdminPageGate permission="analytics:read">
      <AdminShell
        title="SEO Intelligence"
        subtitle="Actionable gap analysis, keyword trends, district coverage, and editor recommendations."
      >
        <SeoIntelligencePanel />
      </AdminShell>
    </AdminPageGate>
  );
}
