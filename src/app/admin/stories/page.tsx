import { AdminPageGate } from "@/components/admin-newsroom/AdminPageGate";
import { AdminShell } from "@/components/admin-newsroom/AdminShell";
import { StoriesTable } from "@/components/admin-newsroom/StoriesTable";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ key?: string }>;
};

export default function AdminStoriesPage({ searchParams }: PageProps) {
  return (
    <AdminPageGate searchParams={searchParams}>
      <AdminShell
        title="Stories"
        subtitle="Approve, edit, feature, and regenerate AI editorials."
      >
        <StoriesTable />
      </AdminShell>
    </AdminPageGate>
  );
}
