import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/infrastructure/auth/cron-auth";
import { isProductionDeployment } from "@/lib/infrastructure/production";
import { createAdminServerClient } from "@/lib/supabase";
import { getDefaultTenant } from "@/lib/tenant/registry";

/**
 * Bootstrap owner membership for a Supabase Auth user on the default tenant.
 * POST { userId, email, tenantSlug?, role? }
 */
export async function POST(request: Request) {
  if (isProductionDeployment()) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const auth = verifyCronRequest(request);
  if (!auth.authorized) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    userId?: string;
    email?: string;
    tenantSlug?: string;
    role?: string;
  };

  if (!body.userId || !body.email) {
    return NextResponse.json(
      { ok: false, error: "userId_email_required" },
      { status: 400 }
    );
  }

  const tenant = body.tenantSlug
    ? (await import("@/lib/tenant/registry")).getTenantBySlug(body.tenantSlug) ??
      getDefaultTenant()
    : getDefaultTenant();

  const supabase = createAdminServerClient();

  await supabase.from("tenant_billing").upsert(
    {
      tenant_id: tenant.id,
      plan_id: "starter",
      plan_status: "trialing",
    },
    { onConflict: "tenant_id" }
  );

  const { error } = await supabase.from("tenant_memberships").upsert(
    {
      tenant_id: tenant.id,
      user_id: body.userId,
      email: body.email.trim().toLowerCase(),
      role: body.role ?? "owner",
      status: "active",
    },
    { onConflict: "tenant_id,user_id" }
  );

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    tenantId: tenant.id,
    tenantSlug: tenant.slug,
  });
}
