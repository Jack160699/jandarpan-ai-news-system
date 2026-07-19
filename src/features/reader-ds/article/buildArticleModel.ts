import type { SponsoredStoryMeta } from "@/lib/monetization/types";
import type { NewsArticleRow } from "@/lib/types/news-article";
import type { EditorialMetadata, GeneratedArticleRow } from "@/lib/types/newsroom";
import type { StoryIntelligenceVm } from "@/lib/story/story-intelligence";
import { SITE_URL } from "@/lib/seo/constants";
import { resolveArticleVariant } from "./resolveVariant";
import type { ArticleVariant, ReaderArticleModel } from "./types";

function categoryLabelHi(category?: string | null): string {
  const map: Record<string, string> = {
    politics: "राजनीति",
    business: "व्यापार",
    sports: "खेल",
    local: "जिला",
    health: "स्वास्थ्य",
    technology: "तकनीक",
    world: "विश्व",
    entertainment: "मनोरंजन",
  };
  if (!category) return "ख़बर";
  return map[category] ?? category;
}

export function buildReaderArticleModel(input: {
  article: NewsArticleRow;
  paragraphs: string[];
  related: NewsArticleRow[];
  intelligence?: StoryIntelligenceVm | null;
  editorialMeta?: EditorialMetadata | null;
  generatedRow?: GeneratedArticleRow | null;
  sponsored?: SponsoredStoryMeta | null;
  tags?: string[];
  forcePremium?: boolean;
  forceLiveBlog?: boolean;
  /** QA / Preview override — presentation only; content stays real. */
  forceVariant?: ArticleVariant | null;
}): ReaderArticleModel {
  const {
    article,
    paragraphs,
    related,
    intelligence,
    editorialMeta,
    generatedRow,
    sponsored = null,
    tags = [],
    forcePremium,
    forceLiveBlog,
    forceVariant,
  } = input;

  const slug = article.slug?.trim() || String(article.id);
  const headline = article.ai_headline?.trim() || article.title;
  const summary =
    article.ai_summary?.trim() ||
    intelligence?.editorial.aiSummary?.trim() ||
    null;
  const takeawaysRaw = intelligence?.editorial.takeaways ?? [];
  const takeaways =
    takeawaysRaw.length > 0
      ? takeawaysRaw
      : paragraphs
          .flatMap((p) => p.split(/[।.!?]/).map((s) => s.trim()).filter(Boolean))
          .slice(0, 3);
  const imageUrl =
    article.image_url ||
    editorialMeta?.image?.hero_url ||
    editorialMeta?.image?.og_url ||
    null;

  const variant =
    forceVariant ??
    resolveArticleVariant({
      tags,
      category: article.category,
      imageUrl,
      editorialMeta,
      generatedRow,
      sponsored,
      takeawayCount: takeawaysRaw.length,
      forcePremium,
      forceLiveBlog,
    });

  const cat = categoryLabelHi(article.category);
  const desk =
    intelligence?.attribution?.desk?.nameHi ||
    intelligence?.attribution?.desk?.name ||
    null;
  const kicker =
    variant === "video"
      ? `वीडियो · ${cat}`
      : variant === "explainer"
        ? `एक्सप्लेनर · ${cat}`
        : desk
          ? `${cat} · ${desk}`
          : cat;

  const rawAuthor =
    article.author?.trim() ||
    intelligence?.attribution?.author?.trim() ||
    "जनदर्पण डेस्क";
  const author =
    /editorial\s*desk/i.test(rawAuthor) || rawAuthor === "Editorial Desk"
      ? "जनदर्पण डेस्क"
      : rawAuthor;

  return {
    variant,
    slug,
    canonicalUrl: `${SITE_URL}/story/${slug}`,
    headline,
    kicker,
    summary,
    paragraphs,
    imageUrl,
    imageCaption: null,
    author,
    role: desk || "संवाददाता",
    publishedLabel:
      intelligence?.reader?.publishedAtLabel ??
      intelligence?.attribution?.publishedLabel ??
      null,
    updatedLabel: intelligence?.reader?.updatedAtLabel ?? null,
    readTime: intelligence?.reader?.readTime ?? null,
    categoryLabel: cat,
    tags,
    takeaways,
    isBreaking: variant === "breaking",
    isLive: Boolean(intelligence?.flags?.liveHref),
    liveHref: intelligence?.flags?.liveHref ?? null,
    sponsored,
    related: related.slice(0, 6).map((r) => ({
      slug: r.slug?.trim() || String(r.id),
      headline: r.ai_headline?.trim() || r.title,
      kicker: categoryLabelHi(r.category),
      imageUrl: r.image_url,
      publishedAt: r.published_at,
    })),
    stats: [],
    article,
    intelligence,
    editorialMeta,
    generatedRow,
  };
}
