import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { StoriesTable } from "@/components/admin-newsroom/StoriesTable";

export default function DashboardContentPage() {
  return (
    <DashboardShell
      title="Content"
      subtitle="Manage generated stories — filter, review, edit headlines"
    >
      <StoriesTable />
    </DashboardShell>
  );
}
