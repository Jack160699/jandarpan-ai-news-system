import nextDynamic from "next/dynamic";
import { AdminPageGate } from "@/components/admin-newsroom/AdminPageGate";
import { AdminShell } from "@/components/admin-newsroom/AdminShell";
import { AdminPanelLoading } from "@/components/admin-newsroom/AdminPanelLoading";

const IntelligenceCenterExecutivePanel = nextDynamic(
  () =>
    import("@/sections/admin/IntelligenceCenterExecutivePanel").then((mod) => ({
      default: mod.IntelligenceCenterExecutivePanel,
    })),
  {
    loading: () => <AdminPanelLoading label="Loading intelligence center…" />,
  }
);

export const dynamic = "force-dynamic";

export default function AdminIntelligencePage() {
  return (
    <AdminPageGate permission="analytics:read">
      <AdminShell
        title="Intelligence Center"
        subtitle="Executive read-only overview of newsroom health, coverage insights, workflow status, and editorial opportunities."
      >
        <IntelligenceCenterExecutivePanel />
      </AdminShell>
    </AdminPageGate>
  );
}
