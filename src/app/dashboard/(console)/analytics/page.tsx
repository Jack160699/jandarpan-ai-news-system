import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { NewsroomAnalyticsPanel } from "@/components/dashboard/panels/NewsroomAnalyticsPanel";
import "@/styles/newsroom-analytics.css";

export default function DashboardAnalyticsPage() {
  return (
    <DashboardShell
      title="Newsroom intelligence"
      subtitle="CTR, reading time, scroll depth, regional trends, AI performance, and breaking velocity"
    >
      <NewsroomAnalyticsPanel />
    </DashboardShell>
  );
}
