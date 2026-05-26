import { AdminPageGate } from "@/components/admin-newsroom/AdminPageGate";
import { AdminShell } from "@/components/admin-newsroom/AdminShell";
import { EditorIndexPanel } from "@/sections/admin/EditorIndexPanel";

export default function AdminEditorIndexPage() {
  return (
    <AdminPageGate permission="editorial:write">
      <AdminShell
        title="Editor"
        subtitle="Compose, refine, and publish Jan Darpan stories"
      >
        <EditorIndexPanel />
      </AdminShell>
    </AdminPageGate>
  );
}
