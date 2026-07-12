import { AdminPageGate } from "@/components/admin-newsroom/AdminPageGate";
import { AdminShell } from "@/components/admin-newsroom/AdminShell";
import { AiCopilotPanel } from "@/sections/admin/AiCopilotPanel";

export const dynamic = "force-dynamic";

export default function AdminAiCopilotPage() {
  return (
    <AdminPageGate permission="analytics:read">
      <AdminShell
        title="AI Editorial Copilot"
        subtitle="Unified intelligence command center — ask questions, review priorities, and act from one workspace."
      >
        <AiCopilotPanel />
      </AdminShell>
    </AdminPageGate>
  );
}
