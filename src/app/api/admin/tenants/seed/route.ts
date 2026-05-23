import { NextResponse } from "next/server";
import {
  listStaticTenants,
  upsertTenantToDatabase,
} from "@/lib/tenant/registry";

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const header = request.headers.get("authorization");
  if (header === `Bearer ${secret}`) return true;
  return request.headers.get("x-cron-secret") === secret;
}

/** Seed static tenant presets into Supabase `newsroom_tenants`. */
export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const results: Array<{ slug: string; ok: boolean; error?: string }> = [];

  for (const tenant of listStaticTenants()) {
    const res = await upsertTenantToDatabase(tenant);
    results.push({ slug: tenant.slug, ok: res.ok, error: res.error });
  }

  const failed = results.filter((r) => !r.ok);
  return NextResponse.json({
    ok: failed.length === 0,
    seeded: results.length,
    results,
  });
}
