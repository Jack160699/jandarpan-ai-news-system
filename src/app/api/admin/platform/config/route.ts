import { NextResponse } from "next/server";
import { requireEditorialAuth } from "@/lib/editorial-dashboard/auth";
import { fetchPlatformConfig, updatePlatformConfig } from "@/lib/platform-admin/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireEditorialAuth(request, "content:read");
  if (!auth.ok) return auth.response;

  const config = await fetchPlatformConfig();
  if (!config) {
    return NextResponse.json(
      { ok: false, error: "database_unavailable" },
      { status: 503 }
    );
  }

  return NextResponse.json({ ok: true, config });
}

export async function PATCH(request: Request) {
  const auth = await requireEditorialAuth(request, "editorial:write");
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const p = body as { key?: string; value?: unknown };
  if (p.key !== "homepage_sections" && p.key !== "newsroom_settings") {
    return NextResponse.json({ ok: false, error: "invalid_key" }, { status: 400 });
  }

  const ok = await updatePlatformConfig(p.key, p.value);
  if (!ok) {
    return NextResponse.json({ ok: false, error: "update_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
