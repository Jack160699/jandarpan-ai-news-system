import { AdminPageGate } from "@/components/admin-newsroom/AdminPageGate";
import { AdminShell } from "@/components/admin-newsroom/AdminShell";
import { EnterpriseAnalyticsPanel } from "@/sections/admin/EnterpriseAnalyticsPanel";
import "@/styles/enterprise-analytics.css";

export const dynamic = "force-dynamic";

export default function AdminAnalyticsPage() {
  return (
    <AdminPageGate permission="analytics:read">
      <AdminShell
        title="Enterprise Analytics"
        subtitle="Live readers, engagement, SEO, district heatmaps, productivity, and AI confidence."
      >
        <EnterpriseAnalyticsPanel />
      </AdminShell>
    </AdminPageGate>
  );
}
