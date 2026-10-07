import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/auth/admin-authorization";
import { createProductionDeps } from "@/lib/user-news/supabase-adapters";
import { readJson } from "@/lib/user-news/http";
import { ModerateSchema, UuidSchema } from "@/lib/user-news/schemas";
import { moderate } from "@/lib/user-news/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Ctx = { params: Promise<{ id: string }> };

/**
 * POST — a moderator's decision: approve (publishes), reject, request_edit, hold, block, unpublish, confirm_district.
 * The moderator is the signed-in admin session, never a field in the body. Reject / block / request_edit / unpublish need a written reason,
 * and approving a story that carries review flags needs acknowledgeFlags: true. Every decision is appended to the audit trail.
 */
export async function POST(request: Request, ctx: Ctx) {
  const auth = await requireAdminPermission(request, "publish:write");
  if (!auth.ok) return auth.response;
  const { id } = await ctx.params;
  if (!UuidSchema.safeParse(id).success) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  const body = await readJson(request, ModerateSchema);
  if (!body.ok) return body.response;

  const r = await moderate(await createProductionDeps(), auth.session.userId, id, body.data);
  if (!r.ok) return NextResponse.json({ ok: false, error: r.code, message: r.message, ...(r.details ? { details: r.details } : {}) }, { status: r.status, headers: { "Cache-Control": "no-store" } });
  return NextResponse.json({ ok: true, status: r.submission.status, articleId: r.submission.published_article_id }, { headers: { "Cache-Control": "no-store" } });
}
