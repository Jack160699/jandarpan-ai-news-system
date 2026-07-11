import { NextResponse } from "next/server";
import {
  listStaticTenants,
  upsertTenantToDatabase,
} from "@/lib/tenant/registry";
import { verifyCronRequest } from "@/lib/infrastructure/auth/cron-auth";
import { cronAuthFailureResponse } from "@/lib/infrastructure/auth/cron-response";
import { rejectProductionDebugRequest } from "@/lib/security/production-route-guard";

/** Seed static tenant presets into Supabase `newsroom_tenants`. */
export async function POST(request: Request) {
  const blocked = rejectProductionDebugRequest();
  if (blocked) return blocked;

  const auth = await verifyCronRequest(request, { capability: "admin" });
  if (!auth.authorized) {
    return cronAuthFailureResponse(auth);
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
