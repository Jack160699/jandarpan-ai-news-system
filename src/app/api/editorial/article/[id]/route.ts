import { NextResponse } from "next/server";
import { logEditorialAudit } from "@/lib/dashboard/audit";
import { appendEditorVersion } from "@/lib/editorial-editor/storage";
import type { EditorVersionSnapshot } from "@/lib/editorial-editor/types";
import { requireEditorialAuth } from "@/lib/editorial-dashboard/auth";
import {
  isMissingColumnError,
  traceSchemaMismatch,
} from "@/lib/observability/schema-mismatch-trace";
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

  const selectWithTranslations =
    "id,slug,headline,summary,article_body,hero_image_url,seo_title,seo_description,language,tags,published_at,editorial_status,translations,editorial_metadata,created_at";
  const selectWithoutTranslations =
    "id,slug,headline,summary,article_body,hero_image_url,seo_title,seo_description,language,tags,published_at,editorial_status,editorial_metadata,created_at";

  let { data, error } = await supabase
    .from("generated_articles")
    .select(selectWithTranslations)
    .eq("id", id)
    .maybeSingle();

  // Degraded mode: DB missing translations column (migration not applied).
  if (error && isMissingColumnError(error.message, "translations")) {
    traceSchemaMismatch("generated_articles.translations missing (GET fallback)", {
      route: "GET /api/editorial/article/[id]",
      id,
    });
    const retry = await supabase
      .from("generated_articles")
      .select(selectWithoutTranslations)
      .eq("id", id)
      .maybeSingle();
    data = retry.data as typeof data;
    error = retry.error;
    if (data && typeof data === "object") {
      const row = data as Record<string, unknown>;
      row.translations = null;
      row.__schema = { translations: "missing" };
      data = row as typeof data;
    }
  }

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

  const saveVersion = body.save_version === true;
  const incomingMeta =
    body.editorial_metadata && typeof body.editorial_metadata === "object"
      ? (body.editorial_metadata as Record<string, unknown>)
      : {};

  let editorial_metadata: Record<string, unknown> | undefined = incomingMeta;

  if (saveVersion && typeof body.headline === "string" && typeof body.article_body === "string") {
    const { data: current } = await createAdminServerClient()
      .from("generated_articles")
      .select("editorial_metadata")
      .eq("id", id)
      .maybeSingle();

    const versions = appendEditorVersion(current?.editorial_metadata ?? null, {
      savedAt: new Date().toISOString(),
      headline: body.headline as string,
      summary: (body.summary as string) ?? "",
      article_body: body.article_body as string,
      slug: (body.slug as string) ?? "",
    });

    editorial_metadata = {
      ...(current?.editorial_metadata as Record<string, unknown> | undefined),
      ...incomingMeta,
      editor_versions: versions,
    };
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
    editorial_metadata,
    reviewed_at: new Date().toISOString(),
  };

  const supabase = createAdminServerClient();
  let { error } = await supabase
    .from("generated_articles")
    .update(patch as never)
    .eq("id", id);

  // Degraded mode: if translations column missing, retry without it (and persist into metadata).
  if (error && isMissingColumnError(error.message, "translations")) {
    traceSchemaMismatch("generated_articles.translations missing (PATCH fallback)", {
      route: "PATCH /api/editorial/article/[id]",
      id,
    });
    const metaFallback =
      patch.translations && typeof patch.translations === "object"
        ? {
            ...(editorial_metadata ?? {}),
            translations: patch.translations,
            translations_updated_at: new Date().toISOString(),
          }
        : editorial_metadata;

    const retryPatch = {
      ...patch,
      translations: undefined,
      editorial_metadata: metaFallback,
    };
    const retry = await supabase
      .from("generated_articles")
      .update(retryPatch as never)
      .eq("id", id);
    error = retry.error;
  }

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

  const versions = (editorial_metadata?.editor_versions ?? []) as EditorVersionSnapshot[];

  return NextResponse.json({
    ok: true,
    message: "Draft autosaved",
    versions,
  });
}
