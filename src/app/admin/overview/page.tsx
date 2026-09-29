import { AdminPageGate } from "@/components/admin-newsroom/AdminPageGate";
import { AdminShell } from "@/components/admin-newsroom/AdminShell";
import { OpsCommandCenter } from "@/components/admin-ops/OpsCommandCenter";
import { Av3Disclosure, Av3EmptyState } from "@/components/admin-v3";
import { getAdminAuthorizationContext } from "@/lib/auth/admin-authorization";
import { getOpsView, type OpsView } from "@/lib/admin-ops/snapshot";
import { CommandCentre } from "@/sections/admin/CommandCentre";

export const dynamic = "force-dynamic";

/**
 * Admin home = the operational newsroom control center. Data is fetched on the server (only
 * for sessions that hold monitoring/analytics access) and never blocks the public site: these
 * queries run in their own admin-only path with a short cache.
 */
export default async function AdminOverviewPage() {
  const ctx = await getAdminAuthorizationContext();
  const canSeeOps = Boolean(ctx && (ctx.permissions.includes("monitoring:read") || ctx.permissions.includes("analytics:read")));

  let view: OpsView | null = null;
  let loadError: string | null = null;
  if (canSeeOps) {
    try {
      view = await getOpsView();
    } catch (err) {
      loadError = err instanceof Error ? err.message : "snapshot_failed";
    }
  }

  return (
    <AdminPageGate permission="analytics:read">
      <AdminShell title="Newsroom control center" subtitle="Live pipeline, freshness, sources, coverage and users.">
        {view ? (
          <OpsCommandCenter
            initial={view}
            canRun={Boolean(ctx?.permissions.includes("publish:write"))}
            canViewUsers={Boolean(ctx?.permissions.includes("team:read"))}
          />
        ) : (
          <Av3EmptyState
            title="Operations snapshot unavailable"
            message={
              loadError
                ? `The snapshot query failed (${loadError}). If migration 086 has not been applied yet, apply it and reload.`
                : "Your role does not include monitoring or analytics access."
            }
          />
        )}
        <div style={{ marginTop: "1.5rem" }}>
          <Av3Disclosure title="Daily briefing (legacy command centre)">
            <CommandCentre />
          </Av3Disclosure>
        </div>
      </AdminShell>
    </AdminPageGate>
  );
}
