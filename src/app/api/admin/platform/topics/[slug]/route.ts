import { NextResponse } from "next/server";
import { requireEditorialAuth } from "@/lib/editorial-dashboard/auth";
import { patchAdminTopic } from "@/lib/platform-admin/topics";

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
  const ok = await patchAdminTopic(slug, {
    titleEn: p.titleEn as string | undefined,
    titleHi: p.titleHi as string | undefined,
    descriptionEn: p.descriptionEn as string | undefined,
    descriptionHi: p.descriptionHi as string | undefined,
    keywords: p.keywords as string[] | undefined,
    contentTypes: p.contentTypes as string[] | undefined,
    enabled: p.enabled as boolean | undefined,
    seoTitle: p.seoTitle as string | undefined,
    seoDescription: p.seoDescription as string | undefined,
    aiKeywordSuggestions: p.aiKeywordSuggestions as string[] | undefined,
  });

  if (!ok) {
    return NextResponse.json({ ok: false, error: "update_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
