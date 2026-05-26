import { AdminPageGate } from "@/components/admin-newsroom/AdminPageGate";
import { AdminShell } from "@/components/admin-newsroom/AdminShell";
import { AnalyticsPanel } from "@/sections/admin/AnalyticsPanel";

export const dynamic = "force-dynamic";

export default function AdminAnalyticsPage() {
  return (
    <AdminPageGate permission="analytics:read">
      <AdminShell
        title="Analytics"
        subtitle="Confidence, sources, trending, and ingestion health."
      >
        <AnalyticsPanel />
      </AdminShell>
    </AdminPageGate>
  );
}
