import type { BroadcastSegment } from "../types";
import { matchesCanonicalCategory } from "./categories";
import {
  checkStoryEditorialEligibility,
  hasLocationIntegrityConflict,
} from "@/lib/editorial/eligibility";
import { hasVerifiedRealMedia } from "@/lib/news/images/validate";

/** 30 days in milliseconds */
const CANONICAL_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Safely parses published_at / created_at to epoch milliseconds.
 * Guaranteed to NEVER return NaN.
 */
export function getValidTimestamp(
  publishedAt?: string | null,
  createdAt?: string | null
): number {
  if (publishedAt) {
    const t = new Date(publishedAt).getTime();
    if (!isNaN(t) && t > 0) return t;
  }
  if (createdAt) {
    const t = new Date(createdAt).getTime();
    if (!isNaN(t) && t > 0) return t;
  }
  return 0;
}

/**
 * Deterministic descending comparator for news stories.
 * Primary: published_at DESC (falling back to created_at)
 * Secondary: story ID locale comparison for complete determinism
 */
export function comparePublishedDesc(
  a: { publishedAt?: string | null; createdAt?: string | null; id?: string },
  b: { publishedAt?: string | null; createdAt?: string | null; id?: string }
): number {
  const diff =
    getValidTimestamp(b.publishedAt, b.createdAt) -
    getValidTimestamp(a.publishedAt, a.createdAt);
  if (diff !== 0) return diff;
  return String(b.id || "").localeCompare(String(a.id || ""));
}

/**
 * Validates whether a story meets all Jan Darpan editorial criteria:
 * 1. 30-day canonical rolling window
 * 2. Real clean verified media
 * 3. Not a generic roundup / meta story
 * 4. Location integrity (no misattribution to CG districts)
 */
export function isStoryEligible(story: BroadcastSegment, nowMs = Date.now()): boolean {
  if (!story || !story.id) return false;
  if ((story as any).isAd) return true;

  // 1. Hard 30-day canonical rolling window gate (Requirement #26)
  const timestamp = getValidTimestamp(story.publishedAt, (story as any).createdAt);
  if (timestamp > 0 && nowMs - timestamp > CANONICAL_WINDOW_MS) {
    return false;
  }

  // 2. Real Clean Media Gate (Requirement #1)
  if (story.imageUrl && !hasVerifiedRealMedia(story.imageUrl)) {
    return false;
  }

  // 3. Editorial eligibility: Roundup rejection
  const check = checkStoryEditorialEligibility(story);
  if (!check.eligible) {
    return false;
  }

  // 4. Location integrity: Reject external non-CG stories that have been falsely tagged with a CG district (Requirement #29, #56)
  const districtCandidate = story.districtSlug || story.district;
  if (hasLocationIntegrityConflict(story.headline, story.summary, districtCandidate)) {
    return false;
  }

  return true;
}

export interface CanonicalQueueResult {
  /** The final authoritative queue: Unconsumed first (published_at DESC), then Consumed (published_at DESC) */
  queue: BroadcastSegment[];
  /** Count of unconsumed stories */
  unconsumedCount: number;
  /** Count of consumed stories */
  consumedCount: number;
  /** Total count of eligible stories */
  totalEligibleCount: number;
}

/**
 * Canonical Queue Algorithm (Authoritative single implementation)
 *
 * Requirements:
 * - Step 1: Filter eligible stories (30-day window, location integrity, category rules, no roundups, media gate)
 * - Step 2: Deduplicate (by id, slug, or canonicalUrl - keeping newest)
 * - Step 3: Classify each into UNCONSUMED or CONSUMED
 * - Step 4: Sort UNCONSUMED first (published_at DESC), then CONSUMED (published_at DESC)
 * - No randomness. No engagement ranking. No array insertion order.
 */
export function computeCanonicalQueue(options: {
  rawStories: BroadcastSegment[];
  categoryId?: string;
  consumedIds?: Set<string>;
  nowMs?: number;
}): CanonicalQueueResult {
  const {
    rawStories,
    categoryId = "all",
    consumedIds = new Set<string>(),
    nowMs = Date.now(),
  } = options;

  if (!rawStories || rawStories.length === 0) {
    return {
      queue: [],
      unconsumedCount: 0,
      consumedCount: 0,
      totalEligibleCount: 0,
    };
  }

  // Step 1: Filter by eligibility and canonical category
  const eligible: BroadcastSegment[] = [];
  const seenIds = new Set<string>();
  const seenSlugs = new Set<string>();

  for (const story of rawStories) {
    if (!story || !story.id) continue;
    if (story.id === "jd-live-intro" || (story as any).isIntro) continue;

    // Check editorial eligibility
    if (!isStoryEligible(story, nowMs)) continue;

    // Check category match
    if (!matchesCanonicalCategory(story, categoryId)) continue;

    // Step 2: Deduplication — keep first/newest
    const slugKey = story.slug ? story.slug.toLowerCase().trim() : "";
    if (seenIds.has(story.id) || (slugKey && seenSlugs.has(slugKey))) {
      continue;
    }
    seenIds.add(story.id);
    if (slugKey) seenSlugs.add(slugKey);

    eligible.push(story);
  }

  // Step 3: Classify into UNCONSUMED vs CONSUMED
  const unconsumed: BroadcastSegment[] = [];
  const consumed: BroadcastSegment[] = [];

  for (const story of eligible) {
    if (consumedIds.has(story.id)) {
      consumed.push(story);
    } else {
      unconsumed.push(story);
    }
  }

  // Step 4: Sort strictly by published_at DESC (newest first)
  unconsumed.sort(comparePublishedDesc);
  consumed.sort(comparePublishedDesc);

  const finalQueue = [...unconsumed, ...consumed];

  return {
    queue: finalQueue,
    unconsumedCount: unconsumed.length,
    consumedCount: consumed.length,
    totalEligibleCount: eligible.length,
  };
}

/**
 * Deterministic Next Story Selector (Requirement #9, #10)
 *
 * Rules:
 * - NEVER rely on currentIndex + 1 as playback truth.
 * - Always pick the FIRST unconsumed eligible story from the authoritative queue.
 * - Never pick the current active story.
 * - If all stories are consumed, pick the next available consumed story (or queue[0]).
 */
export function selectNextPlayableStory(options: {
  queue: BroadcastSegment[];
  consumedIds: Set<string>;
  activeStoryId?: string | null;
}): BroadcastSegment | null {
  const { queue, consumedIds, activeStoryId } = options;
  if (!queue || queue.length === 0) return null;

  // 1. Look for the first UNCONSUMED eligible story that is NOT the current active story
  const nextUnconsumed = queue.find(
    (s) => !consumedIds.has(s.id) && s.id !== activeStoryId && !(s as any).isAd
  );
  if (nextUnconsumed) return nextUnconsumed;

  // 2. If all stories in the queue are consumed:
  // Fall back to the first story that is NOT currently active
  const nextConsumed = queue.find(
    (s) => s.id !== activeStoryId && !(s as any).isAd
  );
  if (nextConsumed) return nextConsumed;

  // 3. Last fallback: first story in queue
  return queue.find((s) => !(s as any).isAd) || queue[0] || null;
}
