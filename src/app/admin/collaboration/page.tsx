import { AdminPageGate } from "@/components/admin-newsroom/AdminPageGate";
import { AdminShell } from "@/components/admin-newsroom/AdminShell";
import { CollaborationHubPanel } from "@/sections/admin/CollaborationHubPanel";
import "@/styles/collaboration.css";

export const dynamic = "force-dynamic";

export default function AdminCollaborationPage() {
  return (
    <AdminPageGate permission="editorial:write">
      <AdminShell
        title="Collaboration"
        subtitle="Live editing, chat, approvals, presence, and team notifications."
      >
        <CollaborationHubPanel />
      </AdminShell>
    </AdminPageGate>
  );
}
