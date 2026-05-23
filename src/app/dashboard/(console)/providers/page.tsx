import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { ProvidersPanel } from "@/components/dashboard/panels/ProvidersPanel";

export default function DashboardProvidersPage() {
  return (
    <DashboardShell
      title="Providers"
      subtitle="RSS health, API providers, and source reliability"
    >
      <ProvidersPanel />
    </DashboardShell>
  );
}
