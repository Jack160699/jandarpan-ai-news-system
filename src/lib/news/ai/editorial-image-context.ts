/**
 * Full article context builder for intelligent editorial image prompts
 */

import {
  detectEditorialEntities,
  type DetectedEntities,
  type EditorialStoryTheme,
} from "@/lib/news/ai/editorial-image-entities";
import {
  detectEditorialLocation,
  type DetectedLocation,
} from "@/lib/news/ai/editorial-image-location";
import type {
  GeneratedArticleRow,
  NewsEventRow,
  NewsSignalRow,
} from "@/lib/types/newsroom";

export type EditorialImageContext = {
  headline: string;
  summary: string;
  bodyExcerpt: string;
  category: string;
  region: string | null;
  urgencyScore: number;
  tags: string[];
  location: DetectedLocation;
  entities: DetectedEntities;
  theme: EditorialStoryTheme;
  signalTitles: string[];
  customPrompt?: string | null;
};

export function buildEditorialImageContext(input: {
  article: GeneratedArticleRow;
  event: NewsEventRow | null;
  signals?: NewsSignalRow[];
  customPrompt?: string | null;
}): EditorialImageContext {
  const { article, event, signals = [] } = input;
  const headline = article.headline;
  const summary = article.summary ?? event?.event_summary ?? "";
  const body = article.article_body ?? "";
  const bodyExcerpt = body.replace(/[#*_`]/g, "").slice(0, 600);
  const category = event?.category ?? article.tags[0] ?? "local";
  const region = event?.region ?? null;
  const urgencyScore = event?.urgency_score ?? 50;
  const tags = article.tags ?? [];

  const location = detectEditorialLocation({
    headline,
    summary,
    body: bodyExcerpt,
    region,
  });

  const entities = detectEditorialEntities({
    headline,
    summary,
    body: bodyExcerpt,
    category,
    urgencyScore,
  });

  return {
    headline,
    summary,
    bodyExcerpt,
    category,
    region,
    urgencyScore,
    tags,
    location,
    entities,
    theme: entities.theme,
    signalTitles: signals.map((s) => s.title).slice(0, 4),
    customPrompt: input.customPrompt,
  };
}

export function summarizeContextForPrompt(ctx: EditorialImageContext): string {
  const parts: string[] = [
    `Headline theme: ${ctx.headline.slice(0, 120)}`,
    ctx.summary ? `Summary: ${ctx.summary.slice(0, 200)}` : "",
    ctx.bodyExcerpt ? `Story context: ${ctx.bodyExcerpt.slice(0, 280)}` : "",
  ];

  if (ctx.location.district) {
    parts.push(`Location: ${ctx.location.district}, Chhattisgarh`);
  } else if (ctx.location.state) {
    parts.push(`Location: ${ctx.location.state}, India`);
  } else if (ctx.location.scope === "international") {
    parts.push("Location: international story");
  }

  if (ctx.entities.keywords.length) {
    parts.push(`Key concepts: ${ctx.entities.keywords.join(", ")}`);
  }

  if (ctx.entities.organizations.length) {
    parts.push(
      `Organizations (symbolic only): ${ctx.entities.organizations.slice(0, 3).join(", ")}`
    );
  }

  if (ctx.signalTitles.length) {
    parts.push(`Source angles: ${ctx.signalTitles.slice(0, 2).join("; ")}`);
  }

  return parts.filter(Boolean).join(". ");
}
