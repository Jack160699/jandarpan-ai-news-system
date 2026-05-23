import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { EditorialPanel } from "@/components/dashboard/panels/EditorialPanel";

export default function DashboardEditorialPage() {
  return (
    <DashboardShell
      title="Editorial controls"
      subtitle="Breaking, featured, pin, regenerate — full desk tools"
    >
      <EditorialPanel />
    </DashboardShell>
  );
}
