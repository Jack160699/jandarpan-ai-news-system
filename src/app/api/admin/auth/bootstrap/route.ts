/**
 * POST /api/admin/auth/bootstrap
 * Idempotent tenant + membership repair (CRON_SECRET required)
 */

import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/infrastructure/auth/cron-auth";
import { bootstrapNewsroomAuth } from "@/lib/newsroom-auth/bootstrap";
import { resolveRoleForEmail } from "@/lib/saas-auth/roles";
import { createAdminServerClient, isSupabaseConfigured } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = await verifyCronRequest(request, { capability: "admin" });

  if (!auth.authorized) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, error: "supabase_not_configured" }, { status: 503 });
  }

  let body: { email?: string; userId?: string; tenantSlug?: string; role?: string };
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const email = body.email?.trim().toLowerCase();
  let userId = body.userId;

  if (!userId && email) {
    const supabase = createAdminServerClient();
    const { data } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    const match = data.users.find(
      (u) => u.email?.toLowerCase() === email
    );
    userId = match?.id;
  }

  if (!userId || !email) {
    return NextResponse.json(
      { ok: false, error: "userId_and_email_required" },
      { status: 400 }
    );
  }

  const forceRole = resolveRoleForEmail(email, body.role);

  const result = await bootstrapNewsroomAuth({
    userId,
    email,
    tenantSlug: body.tenantSlug,
    forceRole,
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
  }

  return NextResponse.json(result);
}
