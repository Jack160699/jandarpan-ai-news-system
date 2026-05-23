import { NextResponse } from "next/server";
import { getTenantConfig, toPublicTenantConfig } from "@/lib/tenant/resolve";

export async function GET() {
  const tenant = await getTenantConfig();
  return NextResponse.json({
    ok: true,
    tenant: toPublicTenantConfig(tenant),
  });
}
