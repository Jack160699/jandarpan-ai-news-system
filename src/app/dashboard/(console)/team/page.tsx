import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { TeamPanel } from "@/components/dashboard/panels/TeamPanel";

export default function DashboardTeamPage() {
  return (
    <DashboardShell title="Team" subtitle="User management and role-based access">
      <TeamPanel />
    </DashboardShell>
  );
}
