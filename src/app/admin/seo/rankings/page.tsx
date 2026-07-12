import { AdminPageGate } from "@/components/admin-newsroom/AdminPageGate";
import { AdminShell } from "@/components/admin-newsroom/AdminShell";
import { SerpRankingsPanel } from "@/sections/admin/SerpRankingsPanel";

export const dynamic = "force-dynamic";

export default function AdminSerpRankingsPage() {
  return (
    <AdminPageGate permission="analytics:read">
      <AdminShell
        title="SERP Rankings"
        subtitle="Google search visibility, competitor share, rank movements, and editorial opportunities."
      >
        <SerpRankingsPanel />
      </AdminShell>
    </AdminPageGate>
  );
}
