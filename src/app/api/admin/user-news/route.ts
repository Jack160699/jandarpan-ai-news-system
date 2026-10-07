import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/auth/admin-authorization";
import { createProductionDeps } from "@/lib/user-news/supabase-adapters";
import { isSubmissionStatus, type SubmissionStatus } from "@/lib/user-news/status-machine";
import { listQueue } from "@/lib/user-news/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/admin/user-news?status=submitted,under_review — the moderation queue (moderators and super-admins only). */
export async function GET(request: Request) {
  const auth = await requireAdminPermission(request, "publish:write");
  if (!auth.ok) return auth.response;

  const requested = new URL(request.url).searchParams.get("status");
  const statuses = (requested ? requested.split(",") : ["submitted", "under_review", "approved"]).filter(isSubmissionStatus) as SubmissionStatus[];
  const deps = await createProductionDeps();
  const rows = await listQueue(deps, statuses.length ? statuses : ["submitted", "under_review", "approved"]);

  const items = rows.map((r) => ({
    id: r.id,
    status: r.status,
    language: r.language,
    headline: r.headline,
    category: r.category,
    scope: (r.geo as { scope?: string })?.scope ?? null,
    district: (r.geo as { districtSlug?: string | null })?.districtSlug ?? null,
    declaredDistrict: r.declared_district,
    riskFlags: (r.risk_flags ?? []).map((f) => ({ code: f.code, severity: f.severity })),
    factFlags: (r.fact_flags ?? []).map((f) => ({ code: f.code, severity: f.severity })),
    inputKind: r.input_kind,
    submittedAt: r.submitted_at,
    authorId: r.author_id,
  }));
  return NextResponse.json({ ok: true, items }, { headers: { "Cache-Control": "private, no-store" } });
}
