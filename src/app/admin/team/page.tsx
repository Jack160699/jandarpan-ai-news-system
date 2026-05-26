import { AdminPageGate } from "@/components/admin-newsroom/AdminPageGate";
import { AdminShell } from "@/components/admin-newsroom/AdminShell";
import { TeamManagementPanel } from "@/sections/admin/TeamManagementPanel";

export default function AdminTeamPage() {
  return (
    <AdminPageGate permission="team:read" superAdminOnly>
      <AdminShell
        title="Team"
        subtitle="Invite staff, assign roles, and manage Jan Darpan newsroom access."
      >
        <TeamManagementPanel />
      </AdminShell>
    </AdminPageGate>
  );
}
