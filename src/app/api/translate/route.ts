import { NextRequest, NextResponse } from "next/server";
import { isNewsroomLanguage } from "@/lib/i18n/languages";
import { translateGeneratedArticle } from "@/lib/i18n/multilingual/translate";
import { getGeneratedArticleBySlug } from "@/lib/newsroom/generated/read";
import { verifyCronRequest } from "@/lib/infrastructure/auth/cron-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  const auth = await verifyCronRequest(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    slug?: string;
    languages?: string[];
  };

  if (!body.slug?.trim()) {
    return NextResponse.json({ error: "slug required" }, { status: 400 });
  }

  const row = await getGeneratedArticleBySlug(body.slug.trim());
  if (!row) {
    return NextResponse.json({ error: "article not found" }, { status: 404 });
  }

  const targets = body.languages
    ?.map((l) => l.trim().toLowerCase())
    .filter(isNewsroomLanguage);

  const results = await translateGeneratedArticle(row, targets);

  return NextResponse.json({
    slug: row.slug,
    results,
    translatedAt: new Date().toISOString(),
  });
}
