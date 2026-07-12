import { AdminPageGate } from "@/components/admin-newsroom/AdminPageGate";
import { AdminShell } from "@/components/admin-newsroom/AdminShell";
import { SeoExecutionPanel } from "@/sections/admin/SeoExecutionPanel";

export const dynamic = "force-dynamic";

export default function AdminSeoExecutionPage() {
  return (
    <AdminPageGate permission="analytics:read">
      <AdminShell
        title="SEO Execution"
        subtitle="Human-in-the-loop SEO improvements — review, approve, and apply suggestions. Nothing is auto-published."
      >
        <SeoExecutionPanel />
      </AdminShell>
    </AdminPageGate>
  );
}
