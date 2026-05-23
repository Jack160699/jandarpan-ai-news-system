import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { OverviewPanel } from "@/components/dashboard/panels/OverviewPanel";

export default function DashboardOverviewPage() {
  return (
    <DashboardShell
      title="Overview"
      subtitle="Newsroom analytics and operational health"
    >
      <OverviewPanel />
    </DashboardShell>
  );
}
