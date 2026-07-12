/**
 * Story editorial intelligence — unified view-model.
 * Preferred: editorial_metadata.intelligence_v2 → legacy metadata → deterministic fallback.
 * No AI calls.
 */

import { bundleFromRow } from "@/lib/news/shorts/build-short";
import {
  readEditorialIntelligenceV2,
  type EditorialEntityV2,
} from "@/lib/news/ai/editorial-intelligence-v2";
import type { ParsedStoryContent, StorySection } from "@/lib/news/story-markdown";
import type { StoryTimelineEvent } from "@/lib/news/story-markdown";
import { getDistrict } from "@/lib/regional/districts";
import type { RegionalGeoMetadata } from "@/lib/regional/geo-tagging";
import { resolveGeneratedArticleModifiedAt } from "@/lib/seo/article-dates";
import { categoryLabel } from "@/lib/live-news-display";
import {
  normalizeArticleLanguage,
  type NewsroomLanguage,
} from "@/lib/i18n/languages";
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { EditorialMetadata, GeneratedArticleRow } from "@/lib/types/newsroom";
import type { NewsArticleRow, NewsCategory } from "@/lib/types/news-article";
import type { StoryAttribution } from "@/lib/news/story-view";

const HIGHLIGHT_SECTION_RE =
  /key\s*(points|takeaways|highlights)|highlights|at\s+a\s+glance|मुख्य|मुख्य\s+बातें|सारांश/i;

const CONTEXT_SECTION_RE =
  /why\s+(this\s+)?matters|context|background|what\s+it\s+means|significance|प्रासंगिक|महत्व|पृष्ठभूमि/i;

const OFFICIAL_SOURCE_RE =
  /\b(gov|government|official|nic|ministry|department|प्रशासन|सरकार)\b/i;

const OFFICIAL_URL_RE = /\.(gov|nic)\./i;

const MAX_WHY_WORDS = 80;

export type EditorialQualityBadge = {
  id: string;
  label: string;
};

export type EditorialSourceItem = {
  id: string;
  name: string;
  url: string;
  provider: string;
  confidence?: number;
  publishedAt?: string | null;
  kind: "primary" | "supporting" | "official";
};

export type EditorialIntelligenceVm = {
  aiSummary: string | null;
  takeaways: string[];
  whyThisMatters: string | null;
  entities: EditorialEntityV2[];
  topicChips: string[];
  /** Structured V2 timeline; null → caller may parse markdown */
  timeline: StoryTimelineEvent[] | null;
  sources: EditorialSourceItem[];
  primarySource: EditorialSourceItem | null;
  officialSource: EditorialSourceItem | null;
  qualityBadges: EditorialQualityBadge[];
  readingInfo: {
    readTime: string;
    publishedAtIso: string | null;
    publishedAtLabel: string | null;
    updatedAtIso: string | null;
    updatedAtLabel: string | null;
    district: string | null;
    category: string;
    language: string | null;
    confidence: number | null;
    confidenceLabel: string | null;
  };
  flags: {
    aiGenerated: boolean;
    humanReviewed: boolean;
    multipleSources: boolean;
  };
  labels: EditorialIntelligenceLabels;
  hasLayer: boolean;
};

export type EditorialIntelligenceLabels = {
  aiSummaryTitle: string;
  readHint: string;
  takeawaysTitle: string;
  whyTitle: string;
  sourcesTitle: string;
  primarySource: string;
  supportingSources: string;
  officialSource: string;
  aiGenerated: string;
  humanReviewed: string;
  readingInfoAria: string;
  readTime: string;
  published: string;
  updated: string;
  district: string;
  category: string;
  language: string;
  confidence: string;
  developing: string;
  official: string;
  aiAssisted: string;
  multipleSources: string;
};

function truncateWords(text: string, maxWords: number): string {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return text.trim();
  return `${words.slice(0, maxWords).join(" ")}…`;
}

function normalizeCompare(text: string): string {
  return text.replace(/\s+/g, " ").trim().toLowerCase();
}

function mapV2Timeline(
  items: NonNullable<ReturnType<typeof readEditorialIntelligenceV2>>["timeline"]
): StoryTimelineEvent[] {
  if (!items?.length) return [];
  return items.map((item, index) => ({
    id: `intel-v2-${index}`,
    label: item.label,
    detail: item.detail,
    order: item.order ?? index + 1,
  }));
}

function legacyTakeaways(
  parsed: ParsedStoryContent,
  generatedRow?: GeneratedArticleRow | null
): string[] {
  const bundle = generatedRow ? bundleFromRow(generatedRow) : null;
  if (bundle?.highlights?.length) {
    return bundle.highlights.filter((h) => h.trim().length > 8).slice(0, 6);
  }

  const highlightSection = parsed.sections.find((s) =>
    HIGHLIGHT_SECTION_RE.test(s.title)
  );
  if (!highlightSection) return [];

  return highlightSection.blocks
    .filter((b): b is { type: "list"; items: string[] } => b.type === "list")
    .flatMap((b) => b.items)
    .filter((item) => item.trim().length > 8)
    .slice(0, 6);
}

function legacyWhyThisMatters(
  aiSummary: string | null,
  sections: StorySection[],
  meta: EditorialMetadata | null | undefined
): string | null {
  const section = sections.find((s) => CONTEXT_SECTION_RE.test(s.title));
  if (section) {
    const paragraph = section.paragraphs.find((p) => p.trim().length > 40);
    if (paragraph) return truncateWords(paragraph, MAX_WHY_WORDS);
    const listItem = section.blocks
      .filter((b): b is { type: "list"; items: string[] } => b.type === "list")
      .flatMap((b) => b.items)
      .find((item) => item.trim().length > 40);
    if (listItem) return truncateWords(listItem, MAX_WHY_WORDS);
  }

  const deskSummary = meta?.intelligence_v1?.deskSummary?.trim();
  if (deskSummary) {
    const normalizedDesk = normalizeCompare(deskSummary);
    const normalizedSummary = aiSummary ? normalizeCompare(aiSummary) : "";
    if (!normalizedSummary || normalizedDesk !== normalizedSummary) {
      return truncateWords(deskSummary, MAX_WHY_WORDS);
    }
  }

  return null;
}

function mergeTopicChips(
  pageTags: string[],
  articleTags: string[],
  v2: ReturnType<typeof readEditorialIntelligenceV2>
): string[] {
  const entityLabels = (v2?.entities ?? []).map((e) => e.name.trim()).filter(Boolean);
  const keywords = v2?.reader_keywords ?? [];
  const candidates = [
    ...(pageTags.length ? pageTags : articleTags),
    ...keywords,
    ...entityLabels.slice(0, 3),
  ];

  const seen = new Set<string>();
  const out: string[] = [];
  for (const label of candidates) {
    const key = label.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(label.trim());
    if (out.length >= 8) break;
  }
  return out;
}

function isOfficialSource(item: {
  source: string | null;
  provider: string;
  article_url: string;
}): boolean {
  const blob = `${item.source ?? ""} ${item.provider} ${item.article_url}`;
  return OFFICIAL_SOURCE_RE.test(blob) || OFFICIAL_URL_RE.test(item.article_url);
}

function buildSourceItems(
  meta: EditorialMetadata | null | undefined,
  article: NewsArticleRow
): {
  sources: EditorialSourceItem[];
  primarySource: EditorialSourceItem | null;
  officialSource: EditorialSourceItem | null;
} {
  const attribution = meta?.source_attribution ?? [];
  if (!attribution.length) {
    const fallbackName = article.source?.trim();
    if (!fallbackName) {
      return { sources: [], primarySource: null, officialSource: null };
    }
    const primary: EditorialSourceItem = {
      id: "primary-fallback",
      name: fallbackName,
      url: article.article_url ?? "",
      provider: article.provider ?? "editorial",
      kind: "primary",
    };
    return { sources: [primary], primarySource: primary, officialSource: null };
  }

  const mapped = attribution.map((item, index) => {
    const official = isOfficialSource(item);
    return {
      id: item.signal_id || `source-${index}`,
      name: item.source?.trim() || item.provider || "Source",
      url: item.article_url,
      provider: item.provider,
      confidence: item.confidence,
      publishedAt: item.published_at,
      kind: official ? ("official" as const) : index === 0 ? ("primary" as const) : ("supporting" as const),
    };
  });

  const officialSource = mapped.find((s) => s.kind === "official") ?? null;
  const primarySource =
    mapped.find((s) => s.kind === "primary") ?? mapped[0] ?? null;

  const sources = mapped.map((item) =>
    item.id === officialSource?.id
      ? { ...item, kind: "official" as const }
      : item.id === primarySource?.id
        ? { ...item, kind: "primary" as const }
        : { ...item, kind: "supporting" as const }
  );

  return { sources, primarySource, officialSource };
}

function buildQualityBadges(
  meta: EditorialMetadata | null | undefined,
  editorialStatus: string | null | undefined,
  labels: EditorialIntelligenceLabels,
  flags: EditorialIntelligenceVm["flags"],
  hasOfficialSource: boolean
): EditorialQualityBadge[] {
  const badges: EditorialQualityBadge[] = [];
  const confidence = meta?.ai_confidence;

  if (editorialStatus === "approved") {
    badges.push({ id: "reviewed", label: labels.humanReviewed });
  }
  if (typeof confidence === "number" && confidence >= 0.82) {
    badges.push({ id: "verified", label: getDictionary("en").trust.verified });
  }
  if (flags.multipleSources) {
    badges.push({ id: "multi-source", label: labels.multipleSources });
  }
  if (meta?.is_breaking || meta?.breaking_override) {
    badges.push({ id: "developing", label: labels.developing });
  }
  if (hasOfficialSource) {
    badges.push({ id: "official", label: labels.official });
  }
  if (flags.aiGenerated) {
    badges.push({ id: "ai-assisted", label: labels.aiAssisted });
  }
  return badges;
}

function editorialLabels(language: NewsroomLanguage): EditorialIntelligenceLabels {
  const t = getDictionary(language);
  const en = getDictionary("en");

  if (language === "hi" || language === "cg") {
    return {
      aiSummaryTitle: "AI सारांश",
      readHint: "30 सेकंड पढ़ें",
      takeawaysTitle: t.story.keyPoints,
      whyTitle: "यह क्यों महत्वपूर्ण है",
      sourcesTitle: t.article.transparencyTitle,
      primarySource: "मूल स्रोत",
      supportingSources: "सहायक स्रोत",
      officialSource: "आधिकारिक स्रोत",
      aiGenerated: "AI सहायता से तैयार",
      humanReviewed: t.trust.reviewed,
      readingInfoAria: "पढ़ने की जानकारी",
      readTime: "पढ़ने का समय",
      published: "प्रकाशित",
      updated: "अपडेट",
      district: "जिला",
      category: "श्रेणी",
      language: "भाषा",
      confidence: "विश्वसनीयता",
      developing: t.trust.fastUpdates,
      official: "आधिकारिक",
      aiAssisted: "AI सहायता",
      multipleSources: t.trust.multiSource,
    };
  }

  return {
    aiSummaryTitle: "AI Summary",
    readHint: "30-second read",
    takeawaysTitle: "Key Takeaways",
    whyTitle: "Why This Matters",
    sourcesTitle: t.article.transparencyTitle,
    primarySource: "Original source",
    supportingSources: "Supporting sources",
    officialSource: "Official source",
    aiGenerated: "AI generated",
    humanReviewed: t.trust.reviewed,
    readingInfoAria: "Reading information",
    readTime: "Read time",
    published: "Published",
    updated: "Updated",
    district: "District",
    category: "Category",
    language: "Language",
    confidence: "Confidence",
    developing: en.trust.fastUpdates,
    official: "Official",
    aiAssisted: "AI Assisted",
    multipleSources: en.trust.multiSource,
  };
}

function resolveDistrictLabel(
  generatedRow: GeneratedArticleRow | null | undefined,
  meta: EditorialMetadata | null | undefined
): string | null {
  const geo = generatedRow?.geo_metadata as RegionalGeoMetadata | undefined;
  const regional = meta?.regional as RegionalGeoMetadata | undefined;
  const slug = geo?.primary_district ?? regional?.primary_district;
  if (!slug) return null;
  return getDistrict(slug)?.name ?? slug;
}

function resolveLanguageLabel(language: string | null | undefined): string | null {
  if (!language?.trim()) return null;
  const normalized = normalizeArticleLanguage(language);
  const configs: Record<string, string> = {
    hi: "Hindi",
    en: "English",
    cg: "Chhattisgarhi",
    mr: "Marathi",
    bn: "Bengali",
    ta: "Tamil",
    ur: "Urdu",
  };
  return configs[normalized] ?? language;
}

export type BuildEditorialIntelligenceInput = {
  article: NewsArticleRow;
  editorialMeta?: EditorialMetadata | null;
  generatedRow?: GeneratedArticleRow | null;
  parsed: ParsedStoryContent;
  attribution: StoryAttribution;
  readTime: string;
  publishedAtLabel: string | null;
  updatedAtLabel: string | null;
  displayLanguage: NewsroomLanguage;
  tags?: string[];
};

export function buildEditorialIntelligence(
  input: BuildEditorialIntelligenceInput
): EditorialIntelligenceVm {
  const {
    article,
    editorialMeta,
    generatedRow,
    parsed,
    attribution,
    readTime,
    publishedAtLabel,
    updatedAtLabel,
    displayLanguage,
    tags = [],
  } = input;

  const labels = editorialLabels(displayLanguage);
  const v2 = readEditorialIntelligenceV2(editorialMeta);
  const aiSummary = article.ai_summary?.trim() || null;

  const takeaways = v2?.takeaways?.length
    ? v2.takeaways
    : legacyTakeaways(parsed, generatedRow);

  const whyThisMatters = v2?.why_this_matters?.trim()
    ? truncateWords(v2.why_this_matters, MAX_WHY_WORDS)
    : legacyWhyThisMatters(aiSummary, parsed.sections, editorialMeta);

  const timeline = v2?.timeline?.length ? mapV2Timeline(v2.timeline) : null;
  const entities = v2?.entities ?? [];
  const topicChips = mergeTopicChips(
    tags,
    generatedRow?.tags ?? [],
    v2
  );

  const { sources, primarySource, officialSource } = buildSourceItems(
    editorialMeta,
    article
  );

  const sourceCount = Math.max(
    attribution.sourceCount,
    editorialMeta?.source_count ?? 0,
    sources.length
  );

  const flags = {
    aiGenerated: Boolean(editorialMeta?.model || generatedRow),
    humanReviewed: generatedRow?.editorial_status === "approved",
    multipleSources: sourceCount > 1,
  };

  const confidence =
    typeof editorialMeta?.ai_confidence === "number"
      ? editorialMeta.ai_confidence
      : null;

  const readingInfo = {
    readTime,
    publishedAtIso: article.published_at,
    publishedAtLabel,
    updatedAtIso: generatedRow
      ? resolveGeneratedArticleModifiedAt(generatedRow)
      : article.updated_at,
    updatedAtLabel,
    district: resolveDistrictLabel(generatedRow, editorialMeta),
    category: categoryLabel(article.category as NewsCategory),
    language: resolveLanguageLabel(
      generatedRow?.language ?? article.language ?? null
    ),
    confidence,
    confidenceLabel:
      confidence !== null ? `${Math.round(confidence * 100)}%` : null,
  };

  const qualityBadges = buildQualityBadges(
    editorialMeta,
    generatedRow?.editorial_status,
    labels,
    flags,
    Boolean(officialSource)
  );

  const hasLayer = Boolean(
    aiSummary ||
      takeaways.length ||
      whyThisMatters ||
      sources.length ||
      qualityBadges.length ||
      readingInfo.district ||
      readingInfo.confidenceLabel ||
      (readingInfo.updatedAtLabel &&
        readingInfo.updatedAtIso &&
        readingInfo.publishedAtIso &&
        readingInfo.updatedAtIso !== readingInfo.publishedAtIso)
  );

  return {
    aiSummary,
    takeaways,
    whyThisMatters,
    entities,
    topicChips,
    timeline,
    sources,
    primarySource,
    officialSource,
    qualityBadges,
    readingInfo,
    flags,
    labels,
    hasLayer,
  };
}
