import { NextRequest, NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/infrastructure/auth/cron-auth";
import { buildNewsShortForArticle } from "@/lib/news/shorts/build-short";
import { getGeneratedArticleBySlug } from "@/lib/newsroom/generated/read";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  const auth = await verifyCronRequest(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { slug?: string };
  if (!body.slug?.trim()) {
    return NextResponse.json({ error: "slug required" }, { status: 400 });
  }

  const row = await getGeneratedArticleBySlug(body.slug.trim());
  if (!row) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const bundle = await buildNewsShortForArticle(row);
  return NextResponse.json({ slug: row.slug, bundle });
}
