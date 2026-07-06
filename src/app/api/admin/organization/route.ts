import { NextResponse } from "next/server";
import { requireEditorialAuth } from "@/lib/editorial-dashboard/auth";
import {
  fetchOrganizationSettings,
  mergeOrganizationSettings,
  updateOrganizationSettings,
} from "@/lib/organization/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireEditorialAuth(request, "content:read");
  if (!auth.ok) return auth.response;

  const settings = await fetchOrganizationSettings();
  return NextResponse.json({ ok: true, settings });
}

export async function PATCH(request: Request) {
  const auth = await requireEditorialAuth(request, "team:write");
  if (!auth.ok) return auth.response;

  if (auth.session.membership.role !== "super_admin") {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const settings = mergeOrganizationSettings(body);
  const ok = await updateOrganizationSettings(settings);
  if (!ok) {
    return NextResponse.json({ ok: false, error: "update_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, settings });
}
