/**
 * Module 7 — AI Actions
 * Synthesizes editor recommendations from opportunities + SERP context.
 */

import type {
  SerpAiAction,
  SerpOpportunityRecord,
  SerpPriority,
} from "@/lib/serp-intelligence/types";

const ACTION_LABELS: Record<string, string> = {
  improve_title: "Improve title for better CTR",
  improve_meta: "Improve meta description / schema",
  expand_article: "Expand article depth and coverage",
  create_faq: "Create FAQ section from PAA",
  add_images: "Add optimized images",
  improve_internal_links: "Improve internal linking",
  publish_supporting_article: "Publish supporting article",
  create_topic_page: "Create topic pillar page",
};

export function synthesizeAiActions(
  opportunities: SerpOpportunityRecord[],
  keywordMap: Map<string, string>
): SerpAiAction[] {
  const actions: SerpAiAction[] = [];
  const seen = new Set<string>();

  for (const opp of opportunities) {
    if (!opp.action_type) continue;
    const keyword = keywordMap.get(opp.keyword_id) ?? "unknown";
    const key = `${opp.keyword_id}:${opp.action_type}`;
    if (seen.has(key)) continue;
    seen.add(key);

    actions.push({
      action_type: opp.action_type,
      priority: opp.priority,
      title: ACTION_LABELS[opp.action_type] ?? opp.title,
      reason: opp.reason,
      keyword,
      keyword_id: opp.keyword_id,
      current_position: opp.current_position ?? undefined,
      jandarpan_url: opp.jandarpan_url ?? undefined,
    });
  }

  return sortActionsByPriority(actions);
}

export function sortActionsByPriority(actions: SerpAiAction[]): SerpAiAction[] {
  const order: Record<SerpPriority, number> = {
    high: 0,
    medium: 1,
    low: 2,
  };
  return [...actions].sort(
    (a, b) => order[a.priority] - order[b.priority]
  );
}

export function mergeOpportunityActions(
  base: SerpOpportunityRecord[],
  actions: SerpAiAction[]
): SerpOpportunityRecord[] {
  const actionByKeyword = new Map(
    actions.map((a) => [`${a.keyword_id}:${a.action_type}`, a])
  );

  return base.map((opp) => {
    if (!opp.action_type) return opp;
    const action = actionByKeyword.get(`${opp.keyword_id}:${opp.action_type}`);
    if (!action) return opp;
    return {
      ...opp,
      metadata: {
        ...opp.metadata,
        ai_action: action,
      },
    };
  });
}
