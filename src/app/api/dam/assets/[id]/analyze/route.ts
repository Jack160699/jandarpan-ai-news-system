import { NextResponse } from "next/server";
import { analyzeAssetWithAi } from "@/lib/dam/ai-analysis";
import { getDamAsset } from "@/lib/dam/store";
import { createAdminServerClient } from "@/lib/supabase/admin";
import { requireDashboardSession } from "@/lib/saas-auth/guard";
import { checkEditorialAiRateLimit } from "@/lib/security/ai-rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteCtx = { params: Promise<{ id: string }> };

export async function POST(request: Request, ctx: RouteCtx) {
  const guard = await requireDashboardSession(request, "editorial:write");
  if (!guard.ok) return guard.response;

  const rate = await checkEditorialAiRateLimit(guard.session, "dam-analyze");
  if (!rate.allowed) return rate.response;

  const { id } = await ctx.params;
  const tenantId = guard.session.membership.tenantId;
  const asset = await getDamAsset(tenantId, id);

  if (!asset) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  let imageBase64: string | undefined;
  if (asset.mediaType === "image") {
    try {
      const res = await fetch(asset.publicUrl, { cache: "no-store" });
      const buf = Buffer.from(await res.arrayBuffer());
      imageBase64 = buf.toString("base64");
    } catch {
      /* skip */
    }
  }

  const analysis = await analyzeAssetWithAi({
    mediaType: asset.mediaType,
    mimeType: asset.mimeType,
    name: asset.name,
    imageBase64,
  });

  const supabase = createAdminServerClient();
  await supabase
    .from("dam_assets")
    .update({
      ai_tags: analysis.tags,
      ai_objects: analysis.objects,
      ai_ocr: analysis.ocr,
      ai_caption: analysis.caption,
      ai_faces: analysis.faces,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("tenant_id", tenantId);

  const updated = await getDamAsset(tenantId, id);
  return NextResponse.json({ ok: true, asset: updated, analysis });
}
