import { NextRequest, NextResponse } from "next/server";
import { getStoryArticleBySlug } from "@/lib/story/get-story-data";
import { resolveLocalizedFieldsStrict } from "@/lib/i18n/resolve-article";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug");

  if (!slug) {
    return NextResponse.json({ error: "Missing slug parameter" }, { status: 400 });
  }

  try {
    const article = await getStoryArticleBySlug(slug);
    if (!article) {
      return NextResponse.json({ error: "Story not found" }, { status: 404 });
    }

    const hiFields = resolveLocalizedFieldsStrict(article, "hi");
    const enFields = resolveLocalizedFieldsStrict(article, "en");
    const geo = (article.geo_metadata as Record<string, any>) || {};

    return NextResponse.json({
      slug: article.slug,
      headline: enFields?.headline || article.headline,
      headlineHi: hiFields?.headline || article.headline,
      summary: enFields?.summary || article.summary || "",
      summaryHi: hiFields?.summary || article.summary || "",
      content: hiFields?.articleBody || article.article_body || "",
      district: geo.district || null,
      districtHi: geo.district_hi || geo.district || null,
      imageUrl: article.hero_image_url || "",
      publishedAt: article.published_at || article.created_at || "",
    });
  } catch (err: any) {
    console.error("[api/story-detail] error fetching article:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
