import { AdminPageGate } from "@/components/admin-newsroom/AdminPageGate";
import { AdminShell } from "@/components/admin-newsroom/AdminShell";
import { ImagesPanel } from "@/sections/admin/ImagesPanel";

export const dynamic = "force-dynamic";

export default function AdminImagesPage() {
  return (
    <AdminPageGate permission="editorial:write">
      <AdminShell
        title="Images"
        subtitle="Hero assets, regeneration queue, and visual QA."
      >
        <ImagesPanel />
      </AdminShell>
    </AdminPageGate>
  );
}
