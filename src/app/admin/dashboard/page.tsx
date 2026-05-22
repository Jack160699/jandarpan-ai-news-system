/**
 * Editorial control dashboard
 * Access: /admin/dashboard?key=ADMIN_SECRET
 */

import { isAdminAuthorized } from "@/lib/editorial-dashboard/auth";
import { EditorialControlDashboard } from "@/components/editorial-dashboard/EditorialControlDashboard";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ key?: string }>;
};

export default async function EditorialDashboardPage({ searchParams }: PageProps) {
  const { key } = await searchParams;

  if (!isAdminAuthorized(key)) {
    return (
      <main className="min-h-screen bg-neutral-950 p-8 text-neutral-200">
        <h1 className="text-xl font-semibold">Unauthorized</h1>
        <p className="mt-2 text-sm text-neutral-400">
          Open{" "}
          <code className="text-amber-400">/admin/dashboard?key=ADMIN_SECRET</code>{" "}
          (or set <code className="text-amber-400">ADMIN_SECRET</code> in env).
        </p>
      </main>
    );
  }

  return <EditorialControlDashboard adminKey={key!} />;
}
