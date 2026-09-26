import { NextRequest, NextResponse } from "next/server";
import { getStoryArticleBySlug } from "@/lib/story/get-story-data";
import { resolveLocalizedFieldsStrict } from "@/lib/i18n/resolve-article";
import { resolveCanonicalStoryDistrict } from "@/lib/regional/canonical-district";

function cleanPublicReaderBody(body: string): string {
  if (!body) return "";
  return body
    .replace(/^(?:स्रोत|source|सौजन्य|क्रेडिट|credit|रिपोर्टर|ब्यूरो)\s*:.*$/gim, "")
    .replace(/जन दर्पण ब्यूरो द्वारा सत्यापित स्थानीय कवरेज।?/g, "")
    .replace(/\n\s*\n\s*\n+/g, "\n\n")
    .trim();
}

const isDevanagari = (s: string) => /[\u0900-\u097F]/.test(s || "");

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug");
  const lang = (searchParams.get("lang") || "hi") === "en" ? "en" : "hi";

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

    const districtRes = resolveCanonicalStoryDistrict({
      geo_metadata: article.geo_metadata,
      tags: article.tags,
      headline: article.headline,
      summary: article.summary,
      body: article.article_body,
    });

    const isSourceHindi = isDevanagari(article.headline);

    // Resolve English representation
    const hasEnglishTranslation = Boolean(
      enFields?.headline?.trim() && enFields.summary?.trim() && enFields.articleBody?.trim()
    );
    const hasHindiTranslation = Boolean(
      hiFields?.headline?.trim() && hiFields.summary?.trim() && hiFields.articleBody?.trim()
    );

    let activeHeadline = "";
    let activeSummary = "";
    let activeContent = "";
    let translationStatus: "ready" | "pending" = "ready";

    if (lang === "en") {
      if (hasEnglishTranslation && enFields) {
        activeHeadline = enFields.headline;
        activeSummary = enFields.summary;
        activeContent = cleanPublicReaderBody(enFields.articleBody);
        translationStatus = "ready";
      } else if (!isSourceHindi && article.headline) {
        // Source article is in English
        activeHeadline = article.headline;
        activeSummary = article.summary || "";
        activeContent = cleanPublicReaderBody(article.article_body || "");
        translationStatus = "ready";
      } else {
        // Translation is pending — do NOT leak Hindi text into English mode
        activeHeadline = enFields?.headline || "English Translation Pending";
        activeSummary = enFields?.summary || "The English edition of this report is being finalized by our editorial desk.";
        activeContent = cleanPublicReaderBody(
          enFields?.articleBody ||
            "The English edition of this report is currently being verified and prepared by the editorial desk. Please check back shortly for the full English coverage."
        );
        translationStatus = "pending";
      }
    } else {
      // Hindi mode
      if (hasHindiTranslation && hiFields) {
        activeHeadline = hiFields.headline;
        activeSummary = hiFields.summary;
        activeContent = cleanPublicReaderBody(hiFields.articleBody);
        translationStatus = "ready";
      } else if (isSourceHindi && article.headline) {
        activeHeadline = article.headline;
        activeSummary = article.summary || "";
        activeContent = cleanPublicReaderBody(article.article_body || "");
        translationStatus = "ready";
      } else {
        // Source is English, Hindi translation pending
        activeHeadline = hiFields?.headline || "हिंदी अनुवाद प्रक्रियाधीन";
        activeSummary = hiFields?.summary || "इस समाचार का हिंदी संस्करण संपादकीय डेस्क द्वारा तैयार किया जा रहा है।";
        activeContent = cleanPublicReaderBody(
          hiFields?.articleBody ||
            "इस समाचार का हिंदी संस्करण वर्तमान में संपादकीय डेस्क द्वारा सत्यापित एवं तैयार किया जा रहा है। कृपया शीघ्र ही संपूर्ण हिंदी कवरेज के लिए पुनः देखें।"
        );
        translationStatus = "pending";
      }
    }

    const locationHi =
      districtRes.displayTagHi ||
      districtRes.nameHi ||
      (districtRes.geographicScope === "international"
        ? "विदेश डेस्क"
        : districtRes.geographicScope === "national"
        ? "राष्ट्रीय डेस्क"
        : "राज्य डेस्क");

    const locationEn =
      districtRes.displayTagEn ||
      districtRes.nameEn ||
      (districtRes.geographicScope === "international"
        ? "World Desk"
        : districtRes.geographicScope === "national"
        ? "National Desk"
        : "State Desk");

    const activeDistrict = lang === "hi" ? locationHi : locationEn;

    return NextResponse.json({
      slug: article.slug,
      headline: activeHeadline,
      headlineHi: hiFields?.headline || (isSourceHindi ? article.headline : ""),
      headlineEn: enFields?.headline || (!isSourceHindi ? article.headline : ""),
      summary: activeSummary,
      summaryHi: hiFields?.summary || (isSourceHindi ? article.summary || "" : ""),
      summaryEn: enFields?.summary || (!isSourceHindi ? article.summary || "" : ""),
      content: activeContent,
      contentEn: cleanPublicReaderBody(enFields?.articleBody || (!isSourceHindi ? article.article_body || "" : "")),
      contentHi: cleanPublicReaderBody(hiFields?.articleBody || (isSourceHindi ? article.article_body || "" : "")),
      district: activeDistrict,
      districtHi: locationHi,
      districtEn: locationEn,
      districtSlug: districtRes.districtSlug,
      locality: districtRes.localityEn,
      localityHi: districtRes.localityHi,
      localityEn: districtRes.localityEn,
      geographicScope: districtRes.geographicScope,
      imageUrl: article.hero_image_url || "",
      publishedAt: article.published_at || article.created_at || "",
      readingTime:
        lang === "hi"
          ? hiFields?.readingTime || article.reading_time || "3 मिनट"
          : enFields?.readingTime || "3 min read",
      translationStatus,
    });
  } catch (err: any) {
    console.error("[api/story-detail] error fetching article:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
