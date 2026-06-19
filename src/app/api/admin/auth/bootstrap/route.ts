/**
 * POST /api/admin/auth/bootstrap
 * Idempotent tenant + membership repair (CRON_SECRET or dev only)
 */

import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/infrastructure/auth/cron-auth";
import { isProductionDeployment } from "@/lib/infrastructure/production";
import { bootstrapNewsroomAuth } from "@/lib/newsroom-auth/bootstrap";
import { createAdminServerClient, isSupabaseConfigured } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = await verifyCronRequest(request);

  if (isProductionDeployment() && !auth.authorized) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, error: "supabase_not_configured" }, { status: 503 });
  }

  let body: { email?: string; userId?: string; tenantSlug?: string };
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

  const result = await bootstrapNewsroomAuth({
    userId,
    email,
    tenantSlug: body.tenantSlug,
    forceRole: email === "shriyanshchandrakar@gmail.com" ? "super_admin" : undefined,
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
  }

  return NextResponse.json({ ...result, ok: true });
}
