import { NextResponse } from "next/server";
import { requireEditorialAuth } from "@/lib/editorial-dashboard/auth";
import { listAdminArticles } from "@/lib/platform-admin/articles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireEditorialAuth(request, "content:read");
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const result = await listAdminArticles({
    page: Number(searchParams.get("page") ?? "1"),
    pageSize: Number(searchParams.get("pageSize") ?? "25"),
    search: searchParams.get("search") ?? undefined,
    source: (searchParams.get("source") as "all" | "generated" | "platform") ?? "all",
    workflowStatus: searchParams.get("workflowStatus") ?? undefined,
    editorialStatus: searchParams.get("editorialStatus") ?? undefined,
    district: searchParams.get("district") ?? undefined,
    category: searchParams.get("category") ?? undefined,
    language: searchParams.get("language") ?? undefined,
    breaking: searchParams.get("breaking") === "true" ? true : undefined,
    published: (searchParams.get("published") as "all" | "published" | "draft") ?? "all",
  }, auth.session.membership.tenantId);

  if (!result) {
    return NextResponse.json(
      { ok: false, error: "database_unavailable" },
      { status: 503 }
    );
  }

  return NextResponse.json({ ok: true, ...result });
}
