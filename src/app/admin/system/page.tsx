import { AdminPageGate } from "@/components/admin-newsroom/AdminPageGate";
import { AdminShell } from "@/components/admin-newsroom/AdminShell";
import { SystemValidationPanel } from "@/sections/admin/SystemValidationPanel";

export const dynamic = "force-dynamic";

export default function AdminSystemPage() {
  return (
    <AdminPageGate permission="monitoring:read">
      <AdminShell
        title="System Validation"
        subtitle="Release manager — validate every subsystem before deployment. No business logic changes."
      >
        <SystemValidationPanel />
      </AdminShell>
    </AdminPageGate>
  );
}
