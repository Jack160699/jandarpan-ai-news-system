import { NextResponse } from "next/server";
import { logEditorialAudit } from "@/lib/dashboard/audit";
import { requireEditorialAuth } from "@/lib/editorial-dashboard/auth";
import { createAdminServerClient, isSupabaseConfigured } from "@/lib/supabase";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, context: RouteContext) {
  const auth = await requireEditorialAuth(request, "editorial:write");
  if (!auth.ok) return auth.response;

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, error: "No database" }, { status: 500 });
  }

  const { id } = await context.params;
  const supabase = createAdminServerClient();
  const { data, error } = await supabase
    .from("generated_articles")
    .select(
      "id,slug,headline,summary,article_body,hero_image_url,seo_title,seo_description,language,tags,published_at,editorial_status,translations,editorial_metadata,created_at"
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json(
      { ok: false, error: error?.message ?? "Article not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true, article: data });
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireEditorialAuth(request, "editorial:write");
  if (!auth.ok) return auth.response;

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, error: "No database" }, { status: 500 });
  }

  const { id } = await context.params;
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const patch = {
    slug: typeof body.slug === "string" ? body.slug.trim() : undefined,
    headline: typeof body.headline === "string" ? body.headline.trim() : undefined,
    summary: typeof body.summary === "string" ? body.summary : undefined,
    article_body: typeof body.article_body === "string" ? body.article_body : undefined,
    hero_image_url:
      typeof body.hero_image_url === "string" ? body.hero_image_url.trim() : undefined,
    seo_title: typeof body.seo_title === "string" ? body.seo_title : undefined,
    seo_description:
      typeof body.seo_description === "string" ? body.seo_description : undefined,
    language: typeof body.language === "string" ? body.language : undefined,
    tags: Array.isArray(body.tags) ? body.tags : undefined,
    published_at:
      typeof body.published_at === "string" && body.published_at
        ? body.published_at
        : body.published_at === null
          ? null
          : undefined,
    translations:
      body.translations && typeof body.translations === "object"
        ? body.translations
        : undefined,
    editorial_metadata:
      body.editorial_metadata && typeof body.editorial_metadata === "object"
        ? body.editorial_metadata
        : undefined,
    reviewed_at: new Date().toISOString(),
  };

  const supabase = createAdminServerClient();
  const { error } = await supabase.from("generated_articles").update(patch).eq("id", id);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  await logEditorialAudit({
    session: auth.session,
    action: "editorial.article_patch",
    resourceType: "article",
    resourceId: id,
    payload: { fields: Object.keys(patch).filter((k) => patch[k as keyof typeof patch] !== undefined) },
  });

  return NextResponse.json({ ok: true, message: "Draft autosaved" });
}
