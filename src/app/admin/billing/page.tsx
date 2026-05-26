import { AdminPageGate } from "@/components/admin-newsroom/AdminPageGate";
import { AdminShell } from "@/components/admin-newsroom/AdminShell";
import { BillingPanel } from "@/sections/admin/BillingPanel";

export const dynamic = "force-dynamic";

export default function AdminBillingPage() {
  return (
    <AdminPageGate permission="billing:read">
      <AdminShell
        title="Billing"
        subtitle="Plans, usage limits, and subscription status for your newsroom tenant."
      >
        <BillingPanel />
      </AdminShell>
    </AdminPageGate>
  );
}
