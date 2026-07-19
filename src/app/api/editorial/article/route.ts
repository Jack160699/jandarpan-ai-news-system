import { NextResponse } from "next/server";
import { logEditorialAudit } from "@/lib/dashboard/audit";
import { slugifyHeadline } from "@/lib/editorial-editor/seo";
import { requireEditorialAuth } from "@/lib/editorial-dashboard/auth";
import { createAdminServerClient, isSupabaseConfigured } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = await requireEditorialAuth(request, "editorial:write");
  if (!auth.ok) return auth.response;

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, error: "No database" }, { status: 500 });
  }

  let body: { headline?: string; language?: string };
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  // Desk seed drafts must not use publishable placeholder titles like "Untitled story".
  const headline = body.headline?.trim() || `Desk draft ${new Date().toISOString().slice(0, 10)}`;
  const slug = `${slugifyHeadline(headline)}-${Date.now().toString(36)}`;
  const tenantId = auth.session.membership.tenantId;

  const supabase = createAdminServerClient();
  const { data, error } = await supabase
    .from("generated_articles")
    .insert({
      slug,
      headline,
      summary: "",
      article_body: "",
      language: body.language ?? "hi",
      tags: [],
      editorial_status: "pending",
      workflow_status: "draft",
      tenant_id: tenantId,
      editorial_metadata: {
        draft_state: { createdAt: new Date().toISOString(), authoring: true },
        desk_placeholder: true,
        publication_blocked: true,
        editor_versions: [],
      },
    })
    .select("id")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { ok: false, error: error?.message ?? "create_failed" },
      { status: 500 }
    );
  }

  await logEditorialAudit({
    session: auth.session,
    action: "editorial.article_create",
    resourceType: "article",
    resourceId: data.id,
    payload: { slug, headline },
  });

  return NextResponse.json({ ok: true, id: data.id });
}
