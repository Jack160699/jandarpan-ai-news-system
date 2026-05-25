import { AdminPageGate } from "@/components/admin-newsroom/AdminPageGate";
import { AdminShell } from "@/components/admin-newsroom/AdminShell";
import { PlatformArticlesPanel } from "@/components/admin-newsroom/PlatformAdminPanels";

export const dynamic = "force-dynamic";

type PageProps = { searchParams: Promise<{ key?: string }> };

export default function AdminArticlesPage({ searchParams }: PageProps) {
  return (
    <AdminPageGate searchParams={searchParams}>
      <AdminShell
        title="Articles"
        subtitle="Platform article corpus — mock data until Supabase sync."
      >
        <PlatformArticlesPanel />
      </AdminShell>
    </AdminPageGate>
  );
}
