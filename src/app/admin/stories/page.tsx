import { AdminPageGate } from "@/components/admin-newsroom/AdminPageGate";
import { AdminShell } from "@/components/admin-newsroom/AdminShell";
import { StoriesTable } from "@/components/admin-newsroom/StoriesTable";

export const dynamic = "force-dynamic";

export default function AdminStoriesPage() {
  return (
    <AdminPageGate permission="editorial:write">
      <AdminShell
        title="Stories moderation"
        subtitle="Review, approve, and publish generated articles."
      >
        <StoriesTable />
      </AdminShell>
    </AdminPageGate>
  );
}
