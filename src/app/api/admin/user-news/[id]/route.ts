import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/auth/admin-authorization";
import { createProductionDeps } from "@/lib/user-news/supabase-adapters";
import { UuidSchema } from "@/lib/user-news/schemas";
import { getReviewBundle } from "@/lib/user-news/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/**
 * GET — everything a moderator needs: the author's original text and voice transcript, every AI/author/moderator revision, risk and fact
 * flags, geography evidence, media with short-lived URLs, the moderation history and the author's verification RESULT (never identity data).
 */
export async function GET(request: Request, ctx: Ctx) {
  const auth = await requireAdminPermission(request, "publish:write");
  if (!auth.ok) return auth.response;
  const { id } = await ctx.params;
  if (!UuidSchema.safeParse(id).success) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  const r = await getReviewBundle(await createProductionDeps(), id);
  if (!r.ok) return NextResponse.json({ ok: false, error: r.code, message: r.message }, { status: r.status });
  return NextResponse.json({ ok: true, bundle: r.bundle }, { headers: { "Cache-Control": "private, no-store" } });
}
