import nextDynamic from "next/dynamic";
import { AdminPageGate } from "@/components/admin-newsroom/AdminPageGate";
import { AdminShell } from "@/components/admin-newsroom/AdminShell";
import { AdminPanelLoading } from "@/components/admin-newsroom/AdminPanelLoading";

const ExecutiveDigestReport = nextDynamic(
  () =>
    import("@/sections/admin/ExecutiveDigestReport").then((mod) => ({
      default: mod.ExecutiveDigestReport,
    })),
  {
    loading: () => <AdminPanelLoading label="Preparing executive digest…" />,
  }
);

export const dynamic = "force-dynamic";

export default function AdminIntelligenceDigestPage() {
  return (
    <AdminPageGate permission="analytics:read">
      <AdminShell
        title="Executive Intelligence Digest"
        subtitle="Printable and copy-friendly executive report projected from the Intelligence Center."
      >
        <ExecutiveDigestReport />
      </AdminShell>
    </AdminPageGate>
  );
}
