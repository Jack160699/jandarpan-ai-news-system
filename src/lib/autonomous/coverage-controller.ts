/**
 * District coverage controller — deficit math + prioritization.
 * Shadow mode returns a plan only; never triggers publish.
 */

import {
  CG_DISTRICTS,
  type DistrictTierLabel,
} from "@/lib/regional/districts";
import {
  getAutonomousRolloutStage,
  isAutonomousKillSwitchOn,
  isAutonomousPublishingEnabled,
} from "@/lib/autonomous/rollout-state";
import type { CoveragePlan, CoveragePlanItem } from "@/lib/autonomous/types";

export type PublishedCountByDistrict = Record<string, number>;

export type BuildCoveragePlanInput = {
  day: string;
  publishedByDistrict: PublishedCountByDistrict;
  env?: NodeJS.ProcessEnv;
};

function tierPriorityBonus(tier: DistrictTierLabel): number {
  if (tier === "high") return 100;
  if (tier === "medium") return 50;
  return 10;
}

export function computeDistrictDeficit(
  target: number,
  published: number
): number {
  return Math.max(0, target - Math.max(0, published));
}

/**
 * Build an ordered coverage plan. Under-covered districts first,
 * then higher tier, then higher absolute target.
 * Does NOT publish — callers must check publishingEnabled.
 */
export function buildCoveragePlan(input: BuildCoveragePlanInput): CoveragePlan {
  const env = input.env ?? process.env;
  const stage = getAutonomousRolloutStage(env);
  const killSwitch = isAutonomousKillSwitchOn(env);
  const publishingEnabled = isAutonomousPublishingEnabled(env);

  const items: CoveragePlanItem[] = CG_DISTRICTS.map((d) => {
    const published = input.publishedByDistrict[d.slug] ?? 0;
    const deficit = computeDistrictDeficit(d.dailyTarget, published);
    const priorityScore =
      deficit * 10 + tierPriorityBonus(d.tierLabel) + d.dailyTarget;
    return {
      districtSlug: d.slug,
      tier: d.tierLabel,
      target: d.dailyTarget,
      published,
      deficit,
      priorityScore,
    };
  });

  items.sort((a, b) => {
    if (b.deficit !== a.deficit) return b.deficit - a.deficit;
    if (b.priorityScore !== a.priorityScore) {
      return b.priorityScore - a.priorityScore;
    }
    return a.districtSlug.localeCompare(b.districtSlug);
  });

  const totalDeficit = items.reduce((s, i) => s + i.deficit, 0);
  const totalTarget = items.reduce((s, i) => s + i.target, 0);
  const totalPublished = items.reduce((s, i) => s + i.published, 0);

  return {
    day: input.day,
    mode: killSwitch ? stage : stage,
    publishingEnabled: killSwitch ? false : publishingEnabled,
    items,
    totalDeficit,
    totalTarget,
    totalPublished,
  };
}

/**
 * Under-covered districts only, ordered for fetch/generate planning.
 */
export function getUnderCoveredDistricts(
  plan: CoveragePlan
): CoveragePlanItem[] {
  return plan.items.filter((i) => i.deficit > 0);
}

/**
 * Shadow-safe execution gate: always returns plan; publishAllowed is false
 * in shadow / kill-switch.
 */
export function runCoverageController(input: BuildCoveragePlanInput): {
  plan: CoveragePlan;
  publishAllowed: boolean;
  paused: boolean;
} {
  const env = input.env ?? process.env;
  const paused = isAutonomousKillSwitchOn(env);
  const plan = buildCoveragePlan(input);
  return {
    plan,
    publishAllowed: plan.publishingEnabled && !paused,
    paused,
  };
}
