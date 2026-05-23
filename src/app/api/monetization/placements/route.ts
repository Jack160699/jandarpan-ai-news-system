import { NextResponse } from "next/server";
import { fetchMonetizationPayload } from "@/lib/monetization/fetch-payload";
import { getTenantConfig } from "@/lib/tenant/resolve";

export async function GET() {
  const tenant = await getTenantConfig();
  const payload = await fetchMonetizationPayload(tenant);
  return NextResponse.json({ ok: true, ...payload });
}
