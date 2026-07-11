import { AdminPageGate } from "@/components/admin-newsroom/AdminPageGate";
import { AdminShell } from "@/components/admin-newsroom/AdminShell";
import { AnalyticsDashboardV3 } from "@/features/analytics";
import { isAnalyticsV3Enabled } from "@/features/analytics/config";
import { EnterpriseAnalyticsPanel } from "@/sections/admin/EnterpriseAnalyticsPanel";
import "@/styles/enterprise-analytics.css";

export const dynamic = "force-dynamic";

const v3Enabled = isAnalyticsV3Enabled();

export default function AdminAnalyticsPage() {
  return (
    <AdminPageGate permission="analytics:read">
      <AdminShell
        title={v3Enabled ? "Executive Analytics" : "Enterprise Analytics"}
        subtitle={
          v3Enabled
            ? "Real-time reader intelligence, engagement, AI usage, and platform health."
            : "Live readers, engagement, SEO, district heatmaps, productivity, and AI confidence."
        }
      >
        {v3Enabled ? <AnalyticsDashboardV3 /> : <EnterpriseAnalyticsPanel />}
      </AdminShell>
    </AdminPageGate>
  );
}
