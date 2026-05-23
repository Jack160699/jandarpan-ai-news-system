import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { MonitoringPanel } from "@/components/dashboard/panels/MonitoringPanel";

export default function DashboardMonitoringPage() {
  return (
    <DashboardShell
      title="API monitoring"
      subtitle="Route latency, error rates, and pipeline queues"
    >
      <MonitoringPanel />
    </DashboardShell>
  );
}
