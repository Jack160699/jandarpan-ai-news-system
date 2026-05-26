import { NextResponse } from "next/server";
import { requireEditorialAuth } from "@/lib/editorial-dashboard/auth";
import { createAdminDistrict, listAdminDistricts } from "@/lib/platform-admin/districts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireEditorialAuth(request, "content:read");
  if (!auth.ok) return auth.response;

  const districts = await listAdminDistricts();
  if (!districts) {
    return NextResponse.json(
      { ok: false, error: "database_unavailable" },
      { status: 503 }
    );
  }

  return NextResponse.json({ ok: true, districts });
}

export async function POST(request: Request) {
  const auth = await requireEditorialAuth(request, "editorial:write");
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const p = body as Record<string, string>;
  if (!p.slug || !p.nameEn || !p.nameHi) {
    return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 });
  }

  const ok = await createAdminDistrict({
    slug: p.slug,
    nameEn: p.nameEn,
    nameHi: p.nameHi,
    priorityTier: Number(p.priorityTier) || 2,
    sections: Array.isArray(p.sections) ? (p.sections as string[]) : undefined,
  });

  if (!ok) {
    return NextResponse.json({ ok: false, error: "create_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
