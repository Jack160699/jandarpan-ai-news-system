/**
 * Module 5 — Opportunity Detector
 */

import type {
  SerpCollectedSnapshot,
  SerpOpportunityRecord,
  SerpPriority,
} from "@/lib/serp-intelligence/types";
import { isJandarpanDomain } from "@/lib/serp-intelligence/parser";

export interface JandarpanArticleHint {
  slug: string;
  url: string;
  headline: string;
  word_count: number | null;
  has_faq: boolean;
  has_schema: boolean;
  internal_link_count: number;
}

function strikingDistancePriority(position: number): SerpPriority {
  if (position <= 7) return "high";
  if (position <= 12) return "medium";
  return "low";
}

function findJandarpanInSerp(snapshot: SerpCollectedSnapshot): {
  position: number;
  url: string;
  title: string;
  snippet: string;
} | null {
  for (const result of snapshot.organic_results) {
    if (isJandarpanDomain(result.domain)) {
      return {
        position: result.position,
        url: result.url,
        title: result.title,
        snippet: result.snippet,
      };
    }
  }
  return null;
}

function topCompetitorWeak(snapshot: SerpCollectedSnapshot): boolean {
  const top = snapshot.organic_results.find((r) => r.position === 1);
  if (!top || isJandarpanDomain(top.domain)) return false;
  return top.snippet.length < 80 || top.title.length < 30;
}

export function detectOpportunities(
  keywordId: string,
  snapshot: SerpCollectedSnapshot,
  articleHint?: JandarpanArticleHint | null
): SerpOpportunityRecord[] {
  const opportunities: SerpOpportunityRecord[] = [];
  const jandarpan = findJandarpanInSerp(snapshot);
  const features = snapshot.serp_features;

  if (jandarpan && jandarpan.position >= 4 && jandarpan.position <= 15) {
    opportunities.push({
      keyword_id: keywordId,
      opportunity_type: "striking_distance",
      action_type: "expand_article",
      priority: strikingDistancePriority(jandarpan.position),
      title: `Striking distance for "${snapshot.keyword}"`,
      reason: `Jandarpan ranks #${jandarpan.position} — within reach of page 1 top 3.`,
      current_position: jandarpan.position,
      jandarpan_url: jandarpan.url,
      scores: { position_score: 100 - jandarpan.position * 5 },
    });
  }

  if (topCompetitorWeak(snapshot)) {
    opportunities.push({
      keyword_id: keywordId,
      opportunity_type: "weak_competitor_content",
      action_type: "publish_supporting_article",
      priority: "high",
      title: `Weak #1 content for "${snapshot.keyword}"`,
      reason: "Top organic result has thin title/snippet — opportunity to outrank.",
      current_position: jandarpan?.position ?? null,
      jandarpan_url: jandarpan?.url ?? null,
      scores: { weakness_score: 75 },
    });
  }

  if (jandarpan && jandarpan.position >= 4 && jandarpan.position <= 8) {
    const titleLen = jandarpan.title.length;
    if (titleLen < 40 || titleLen > 70) {
      opportunities.push({
        keyword_id: keywordId,
        opportunity_type: "ctr_opportunity",
        action_type: "improve_title",
        priority: "medium",
        title: `CTR title optimization for "${snapshot.keyword}"`,
        reason: `Ranking #${jandarpan.position} with suboptimal title length (${titleLen} chars).`,
        current_position: jandarpan.position,
        jandarpan_url: jandarpan.url,
        scores: { ctr_score: 60 },
      });
    }
  }

  if (features.people_also_ask && features.paa_questions?.length) {
    const hasFaq = articleHint?.has_faq ?? false;
    if (!hasFaq && jandarpan) {
      opportunities.push({
        keyword_id: keywordId,
        opportunity_type: "missing_faq",
        action_type: "create_faq",
        priority: "high",
        title: `Add FAQ for "${snapshot.keyword}"`,
        reason: `SERP shows ${features.paa_questions.length} People Also Ask questions — no FAQ on page.`,
        current_position: jandarpan.position,
        jandarpan_url: jandarpan.url,
        metadata: { paa_questions: features.paa_questions.slice(0, 5) },
        scores: { faq_gap_score: 80 },
      });
    }
  }

  if (jandarpan && articleHint && articleHint.internal_link_count < 2) {
    opportunities.push({
      keyword_id: keywordId,
      opportunity_type: "missing_internal_links",
      action_type: "improve_internal_links",
      priority: "medium",
      title: `Add internal links for "${snapshot.keyword}"`,
      reason: "Ranking page has fewer than 2 internal links to related coverage.",
      current_position: jandarpan.position,
      jandarpan_url: jandarpan.url,
      scores: { link_gap_score: 55 },
    });
  }

  if (jandarpan && articleHint && !articleHint.has_schema) {
    opportunities.push({
      keyword_id: keywordId,
      opportunity_type: "missing_schema",
      action_type: "improve_meta",
      priority: "medium",
      title: `Add structured data for "${snapshot.keyword}"`,
      reason: "Ranking article may lack NewsArticle/FAQ schema for rich results.",
      current_position: jandarpan.position,
      jandarpan_url: jandarpan.url,
      scores: { schema_gap_score: 65 },
    });
  }

  const competitorCount = snapshot.organic_results.filter(
    (r) => !isJandarpanDomain(r.domain)
  ).length;
  if (competitorCount >= 7 && (!jandarpan || jandarpan.position > 10)) {
    opportunities.push({
      keyword_id: keywordId,
      opportunity_type: "high_search_opportunity",
      action_type: "create_topic_page",
      priority: jandarpan ? "medium" : "high",
      title: `High competition keyword "${snapshot.keyword}"`,
      reason: `${competitorCount} competitors in top 10 — strong editorial opportunity.`,
      current_position: jandarpan?.position ?? null,
      jandarpan_url: jandarpan?.url ?? null,
      scores: { competition_score: competitorCount * 10 },
    });
  }

  if (features.featured_snippet && jandarpan && jandarpan.position > 1) {
  const owners = features.feature_owners.featured_snippet ?? [];
    const ownsSnippet = owners.some((d) => isJandarpanDomain(d));
    if (!ownsSnippet) {
      opportunities.push({
        keyword_id: keywordId,
        opportunity_type: "serp_feature_gap",
        action_type: "expand_article",
        priority: "high",
        title: `Featured snippet opportunity for "${snapshot.keyword}"`,
        reason: "Featured snippet present but not owned by Jandarpan.",
        current_position: jandarpan.position,
        jandarpan_url: jandarpan.url,
        scores: { snippet_gap_score: 85 },
      });
    }
  }

  return opportunities;
}
