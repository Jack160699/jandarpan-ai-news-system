import Link from "next/link";
import { AdminPageGate } from "@/components/admin-newsroom/AdminPageGate";
import { AdminShell } from "@/components/admin-newsroom/AdminShell";
import { OrganizationSettingsPanel } from "@/components/admin-newsroom/OrganizationSettingsPanel";

export const dynamic = "force-dynamic";

export default function AdminOrganizationSettingsPage() {
  return (
    <AdminPageGate permission="editorial:write">
      <AdminShell
        title="Organization settings"
        subtitle="Publisher identity, contact, social profiles — footer, contact page, JSON-LD."
      >
        <p className="anr-meta mb-4">
          <Link href="/admin/settings" className="text-sky-400 hover:underline">
            ← Platform settings
          </Link>
        </p>
        <OrganizationSettingsPanel />
      </AdminShell>
    </AdminPageGate>
  );
}
