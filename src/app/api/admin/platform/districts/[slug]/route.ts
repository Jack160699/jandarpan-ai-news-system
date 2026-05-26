import { NextResponse } from "next/server";
import { requireEditorialAuth } from "@/lib/editorial-dashboard/auth";
import { patchAdminDistrict } from "@/lib/platform-admin/districts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ slug: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireEditorialAuth(request, "editorial:write");
  if (!auth.ok) return auth.response;

  const { slug } = await context.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const p = body as Record<string, unknown>;
  const ok = await patchAdminDistrict(slug, {
    nameEn: p.nameEn as string | undefined,
    nameHi: p.nameHi as string | undefined,
    priorityTier: p.priorityTier as number | undefined,
    enabled: p.enabled as boolean | undefined,
    sections: p.sections as string[] | undefined,
    homepageConfig: p.homepageConfig as Record<string, unknown> | undefined,
    editorUserIds: p.editorUserIds as string[] | undefined,
  });

  if (!ok) {
    return NextResponse.json({ ok: false, error: "update_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
