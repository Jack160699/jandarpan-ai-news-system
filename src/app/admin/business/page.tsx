import { AdminPageGate } from "@/components/admin-newsroom/AdminPageGate";
import { AdminShell } from "@/components/admin-newsroom/AdminShell";
import { BusinessOverviewDashboard } from "@/sections/admin/BusinessOverviewDashboard";

export const dynamic = "force-dynamic";

export default function AdminBusinessPage() {
  return (
    <AdminPageGate permission="analytics:read">
      <AdminShell
        title="Business overview"
        subtitle="Audience, SEO, revenue, and cost signals in one view."
      >
        <BusinessOverviewDashboard />
      </AdminShell>
    </AdminPageGate>
  );
}
