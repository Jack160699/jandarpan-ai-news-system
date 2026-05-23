import { AdminPageGate } from "@/components/admin-newsroom/AdminPageGate";
import { AdminShell } from "@/components/admin-newsroom/AdminShell";
import { EditorialOverview } from "@/sections/admin/EditorialOverview";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ key?: string }>;
};

export default function AdminEditorialPage({ searchParams }: PageProps) {
  return (
    <AdminPageGate searchParams={searchParams}>
      <AdminShell
        title="Editorial overview"
        subtitle="Supervise ingestion, queues, and breaking editorial flow."
      >
        <EditorialOverview />
      </AdminShell>
    </AdminPageGate>
  );
}
