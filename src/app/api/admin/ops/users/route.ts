/**
 * GET /api/admin/ops/users — paginated, searchable, sortable list of registered users.
 * auth.users is read only through a service-role-only SQL function on the server.
 * Requires team:read (super_admin / team managers); results are never cached.
 */

import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/auth/admin-authorization";
import { noStoreHeaders } from "@/lib/infrastructure/cache/edge";
import { listAdminUsers, type AdminUserQuery } from "@/lib/admin-ops/users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireAdminPermission(request, "team:read");
  if (!auth.ok) return auth.response;

  const sp = new URL(request.url).searchParams;
  const query: AdminUserQuery = {
    search: sp.get("search") ?? undefined,
    sort: (sp.get("sort") as AdminUserQuery["sort"]) ?? undefined,
    dir: (sp.get("dir") as AdminUserQuery["dir"]) ?? undefined,
    page: Number(sp.get("page")) || 1,
    pageSize: Number(sp.get("pageSize")) || 25,
  };

  try {
    const page = await listAdminUsers(query);
    return NextResponse.json({ ok: true, ...page }, { headers: noStoreHeaders() });
  } catch (err) {
    console.error("[admin-ops] users failed:", err);
    return NextResponse.json({ ok: false, error: "users_unavailable" }, { status: 500, headers: noStoreHeaders() });
  }
}
