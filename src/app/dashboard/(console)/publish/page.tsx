import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { PublishPanel } from "@/components/dashboard/panels/PublishPanel";

export default function DashboardPublishPage() {
  return (
    <DashboardShell
      title="Publishing"
      subtitle="Approve and manually publish stories to your live site"
    >
      <PublishPanel />
    </DashboardShell>
  );
}
