import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { BillingPanel } from "@/components/dashboard/panels/BillingPanel";

export default function DashboardBillingPage() {
  return (
    <DashboardShell
      title="Billing"
      subtitle="Plans, usage limits, and Stripe-ready subscription fields"
    >
      <BillingPanel />
    </DashboardShell>
  );
}
