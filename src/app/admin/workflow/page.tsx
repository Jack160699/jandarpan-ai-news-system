import { AdminPageGate } from "@/components/admin-newsroom/AdminPageGate";
import { AdminShell } from "@/components/admin-newsroom/AdminShell";
import { WorkflowBoardPanel } from "@/sections/admin/WorkflowBoardPanel";

export default function AdminWorkflowPage() {
  return (
    <AdminPageGate permission="editorial:write">
      <AdminShell
        title="Workflow"
        subtitle="Kanban pipeline — draft through publish with SLA tracking"
      >
        <WorkflowBoardPanel />
      </AdminShell>
    </AdminPageGate>
  );
}
