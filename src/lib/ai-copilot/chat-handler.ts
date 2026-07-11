/**
 * Module 2 — AI Copilot Chat (intent router + evidence)
 */

import { buildExecutiveDashboard } from "@/lib/ai-copilot/aggregator";
import { searchInsights } from "@/lib/ai-copilot/insight-search";
import { listRecommendations } from "@/lib/ai-copilot/repository";
import type { ChatResponse } from "@/lib/ai-copilot/types";

type Intent =
  | "publish_today"
  | "articles_to_update"
  | "ctr_drop"
  | "district_search"
  | "competitor_analysis"
  | "district_coverage"
  | "priority_improve"
  | "general_search";

function detectIntent(message: string): Intent {
  const m = message.toLowerCase();
  if (/publish today|what should we publish|आज क्या/.test(m)) return "publish_today";
  if (/need(s)? update|improve|articles to fix/.test(m)) return "articles_to_update";
  if (/ctr drop|click.*drop|ctr कम/.test(m)) return "ctr_drop";
  if (/korba|raipur|bilaspur|bastar|durg|kanker|district/.test(m) && /opportunit|show|सभी/.test(m))
    return "district_search";
  if (/competitor|beating us|आगे/.test(m)) return "competitor_analysis";
  if (/under.?cover|coverage|कम कवरेज/.test(m)) return "district_coverage";
  if (/improve first|priority|पहले कौन/.test(m)) return "priority_improve";
  return "general_search";
}

function extractSearchTerm(message: string): string {
  const districts = ["korba", "raipur", "bilaspur", "bastar", "durg", "kanker", "korba"];
  const lower = message.toLowerCase();
  for (const d of districts) {
    if (lower.includes(d)) return d;
  }
  const quoted = message.match(/"([^"]+)"/);
  if (quoted) return quoted[1];
  return message.replace(/show all|opportunities|which|what|why|how/gi, "").trim().slice(0, 40);
}

export async function handleCopilotChat(message: string): Promise<ChatResponse> {
  const intent = detectIntent(message);
  const executive = await buildExecutiveDashboard();
  const queue = await listRecommendations(15);

  switch (intent) {
    case "publish_today": {
      const topics = executive.breakingTopics.slice(0, 5);
      const gaps = queue.filter((r) => r.recommended_action.includes("publish")).slice(0, 5);
      return {
        intent,
        answer: `Based on trending topics and competitor gaps, prioritize ${topics.length} breaking/trending clusters and ${gaps.length} publish recommendations today.`,
        evidence: [
          ...topics.map((t) => `${t.topic} (${t.trend}, score ${t.score})`),
          ...gaps.map((g) => g.reason),
        ],
        links: [
          { label: "SEO Intelligence", href: "/admin/seo/intelligence" },
          { label: "Competitors", href: "/admin/seo/competitors" },
        ],
        suggestedActions: gaps.slice(0, 3).map((g) => ({
          label: g.title,
          action: g.recommended_action,
          recommendationId: g.id,
        })),
      };
    }

    case "articles_to_update": {
      const exec = queue.filter((r) => r.source === "execution_engine").slice(0, 5);
      return {
        intent,
        answer: `${executive.pendingEditorialReviews} articles have pending SEO execution suggestions. Review these first for quick wins.`,
        evidence: exec.map((r) => `${r.article_slug}: ${r.reason}`),
        links: [{ label: "SEO Execution", href: "/admin/seo/execution" }],
        suggestedActions: exec.map((r) => ({
          label: `Audit ${r.article_slug}`,
          action: "open_execution",
          recommendationId: r.id,
        })),
      };
    }

    case "ctr_drop": {
      const delta = executive.trafficTrend.clicksDelta;
      return {
        intent,
        answer:
          delta < 0
            ? `GSC shows clicks declined by ${Math.abs(delta)} over the last 7 days. CTR is ${executive.searchConsoleSummary.ctr}% at avg position ${executive.searchConsoleSummary.avgPosition}.`
            : `CTR trend is stable or positive (+${delta} clicks 7d). Current CTR: ${executive.searchConsoleSummary.ctr}%.`,
        evidence: [
          `7-day click delta: ${delta}`,
          `Impressions: ${executive.trafficTrend.impressions}`,
          `${executive.pendingSeoRecommendations} open SEO recommendations`,
        ],
        links: [{ label: "Search Console", href: "/admin/seo/search-console" }],
        suggestedActions: queue
          .filter((r) => r.source === "search_console")
          .slice(0, 3)
          .map((r) => ({
            label: r.title,
            action: r.recommended_action,
            recommendationId: r.id,
          })),
        chartData: [
          { label: "Clicks", value: executive.trafficTrend.clicks },
          { label: "Delta", value: delta },
        ],
      };
    }

    case "district_search":
    case "general_search": {
      const term = extractSearchTerm(message);
      const results = await searchInsights(term);
      return {
        intent,
        answer: `Found ${results.articles.length} articles, ${results.recommendations.length} recommendations, ${results.serp.length} SERP keywords, and ${results.gsc.length} GSC queries for "${term}".`,
        evidence: [
          ...results.recommendations.slice(0, 3).map((r) => r.title),
          ...results.gsc.slice(0, 3).map((q) => `GSC: ${q.query} (pos ${q.position})`),
        ],
        links: [
          { label: "SERP Rankings", href: "/admin/seo/rankings" },
          { label: "Search Console", href: "/admin/seo/search-console" },
        ],
        suggestedActions: results.recommendations.slice(0, 3).map((r) => ({
          label: r.title,
          action: r.recommended_action,
          recommendationId: r.id,
        })),
      };
    }

    case "competitor_analysis": {
      return {
        intent,
        answer: `Competitors published ${executive.competitorActivity.articlesLast24h} articles today. SERP visibility score: ${executive.serpVisibility}/100.`,
        evidence: queue
          .filter((r) => r.source === "competitor_intelligence" || r.source === "serp_tracker")
          .slice(0, 5)
          .map((r) => r.reason),
        links: [
          { label: "Competitors", href: "/admin/seo/competitors" },
          { label: "SERP Rankings", href: "/admin/seo/rankings" },
        ],
        suggestedActions: [],
      };
    }

    case "district_coverage": {
      const low = executive.districtCoverage
        .filter((d) => d.coveragePercent < 50)
        .slice(0, 5);
      return {
        intent,
        answer:
          low.length > 0
            ? `${low.length} districts have coverage below 50%. Focus on: ${low.map((d) => d.district).join(", ")}.`
            : "District coverage is healthy across monitored regions.",
        evidence: low.map((d) => `${d.district}: ${d.coveragePercent}% coverage`),
        links: [{ label: "SEO Intelligence", href: "/admin/seo/intelligence" }],
        suggestedActions: low.map((d) => ({
          label: `Cover ${d.district}`,
          action: "publish_district",
        })),
      };
    }

    case "priority_improve": {
      const top = queue[0];
      if (!top) {
        return {
          intent,
          answer: "No open recommendations in the priority queue. Run intelligence crons or audit an article.",
          evidence: [],
          links: [{ label: "SEO Execution", href: "/admin/seo/execution" }],
          suggestedActions: [],
        };
      }
      return {
        intent,
        answer: `Top priority: "${top.title}" — ${top.reason}`,
        evidence: [`Source: ${top.source}`, `Score: ${top.priority_score}`, `Confidence: ${Math.round(top.confidence * 100)}%`],
        links: top.article_slug
          ? [
              { label: "Open workspace", href: `/admin/ai-copilot?articleId=${top.article_id}` },
              { label: "SEO Execution", href: "/admin/seo/execution" },
            ]
          : [{ label: "Recommendations", href: "/admin/ai-copilot" }],
        suggestedActions: [
          {
            label: top.recommended_action,
            action: "apply_recommendation",
            recommendationId: top.id,
          },
        ],
      };
    }

    default:
      return {
        intent: "general_search",
        answer: "I can help with publishing priorities, SEO improvements, competitor analysis, and district coverage. Try asking about a specific district or topic.",
        evidence: [],
        links: [{ label: "Intelligence overview", href: "/admin/intelligence" }],
        suggestedActions: [],
      };
  }
}
