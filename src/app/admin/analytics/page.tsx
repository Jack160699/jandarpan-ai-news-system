import { AdminPageGate } from "@/components/admin-newsroom/AdminPageGate";
import { AdminShell } from "@/components/admin-newsroom/AdminShell";
import { AnalyticsPanel } from "@/sections/admin/AnalyticsPanel";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ key?: string }>;
};

export default function AdminAnalyticsPage({ searchParams }: PageProps) {
  return (
    <AdminPageGate searchParams={searchParams}>
      <AdminShell
        title="Analytics"
        subtitle="Confidence, sources, trending, and ingestion health."
      >
        <AnalyticsPanel />
      </AdminShell>
    </AdminPageGate>
  );
}
