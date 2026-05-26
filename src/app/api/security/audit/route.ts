import { NextResponse } from "next/server";
import { createAdminServerClient } from "@/lib/supabase";
import { requireSuperAdminSession } from "@/lib/newsroom-auth/require-super-admin";
import { guardSuperAdminAction } from "@/lib/security/super-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const guard = await requireSuperAdminSession(request);
  if (!guard.ok) return guard.response;

  const block = await guardSuperAdminAction(
    guard.session,
    "security.audit.read",
    request
  );
  if (block) return block;

  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50", 10), 200);
  const tenantId = guard.session.membership.tenantId;

  const supabase = createAdminServerClient();

  const [audit, logins, permissionChanges] = await Promise.all([
    supabase
      .from("security_audit_events")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase
      .from("security_login_events")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase
      .from("security_permission_changes")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(limit),
  ]);

  return NextResponse.json({
    ok: true,
    audit: audit.data ?? [],
    logins: logins.data ?? [],
    permissionChanges: permissionChanges.data ?? [],
  });
}
