import { AdminPageGate } from "@/components/admin-newsroom/AdminPageGate";
import { AdminShell } from "@/components/admin-newsroom/AdminShell";
import { MediaDamPanel } from "@/sections/admin/MediaDamPanel";
import "@/styles/dam-media.css";

export const dynamic = "force-dynamic";

export default function AdminMediaPage() {
  return (
    <AdminPageGate permission="editorial:write">
      <AdminShell
        title="Media Library"
        subtitle="Images, video, audio — AI tagging, folders, CDN variants, and copyright tracking."
      >
        <MediaDamPanel />
      </AdminShell>
    </AdminPageGate>
  );
}
