import { AdminPageGate } from "@/components/admin-newsroom/AdminPageGate";
import { AdminShell } from "@/components/admin-newsroom/AdminShell";
import { AutonomousSeoPanel } from "@/sections/admin/AutonomousSeoPanel";

export const dynamic = "force-dynamic";

export default function AdminAutonomousSeoPage() {
  return (
    <AdminPageGate permission="analytics:read">
      <AdminShell
        title="Autonomous SEO"
        subtitle="Self-optimizing SEO pipeline — safe metadata-only changes, no auto-publishing."
      >
        <AutonomousSeoPanel />
      </AdminShell>
    </AdminPageGate>
  );
}
