/**
 * Editorial / admin API authentication — Supabase session + tenant RBAC
 */

import { requireDashboardSession } from "@/lib/saas-auth/guard";
import type { DashboardPermission, DashboardSession } from "@/lib/saas-auth/types";

export type EditorialAuthResult =
  | { ok: true; session: DashboardSession }
  | { ok: false; response: Response };

export async function requireEditorialAuth(
  request: Request,
  permission: DashboardPermission = "content:read"
): Promise<EditorialAuthResult> {
  const guard = await requireDashboardSession(request, permission);
  if (!guard.ok) {
    return { ok: false, response: guard.response };
  }
  return { ok: true, session: guard.session };
}
