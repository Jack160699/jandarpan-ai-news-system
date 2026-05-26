import { NextResponse } from "next/server";
import { analyzeAssetWithAi } from "@/lib/dam/ai-analysis";
import { deleteDamPaths } from "@/lib/dam/storage";
import { deleteDamAsset, getDamAsset, updateDamAsset } from "@/lib/dam/store";
import { requireDashboardSession } from "@/lib/saas-auth/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(request: Request, ctx: RouteCtx) {
  const guard = await requireDashboardSession(request, "editorial:write");
  if (!guard.ok) return guard.response;

  const { id } = await ctx.params;
  const asset = await getDamAsset(guard.session.membership.tenantId, id);

  if (!asset) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, asset });
}

export async function PATCH(request: Request, ctx: RouteCtx) {
  const guard = await requireDashboardSession(request, "editorial:write");
  if (!guard.ok) return guard.response;

  const { id } = await ctx.params;
  let body: {
    name?: string;
    folderId?: string | null;
    copyright?: Record<string, unknown>;
    aiTags?: string[];
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const ok = await updateDamAsset(guard.session.membership.tenantId, id, {
    name: body.name,
    folderId: body.folderId,
    copyright: body.copyright as import("@/lib/dam/types").DamCopyright | undefined,
    aiTags: body.aiTags,
  });

  return NextResponse.json({ ok });
}

export async function DELETE(request: Request, ctx: RouteCtx) {
  const guard = await requireDashboardSession(request, "editorial:write");
  if (!guard.ok) return guard.response;

  const { id } = await ctx.params;
  const paths = await deleteDamAsset(guard.session.membership.tenantId, id);
  await deleteDamPaths(paths);

  return NextResponse.json({ ok: true });
}
