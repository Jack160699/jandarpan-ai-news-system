/**
 * Lightweight client follows — districts, topics, categories, stories, events.
 * Influences homepage ranking later; Phase 1 stores + UI toggle.
 */

export const FOLLOWS_KEY = "jd-follows-v1";

export type FollowTargetType =
  | "district"
  | "topic"
  | "category"
  | "story"
  | "event";

export type FollowRecord = {
  targetType: FollowTargetType;
  targetId: string;
  label?: string;
  createdAt: string;
};

function readFollows(): FollowRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(FOLLOWS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as FollowRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeFollows(rows: FollowRecord[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(FOLLOWS_KEY, JSON.stringify(rows.slice(0, 120)));
  } catch {
    /* ignore */
  }
}

function keyOf(type: FollowTargetType, id: string) {
  return `${type}:${id}`;
}

export function listFollows(type?: FollowTargetType): FollowRecord[] {
  const rows = readFollows();
  return type ? rows.filter((r) => r.targetType === type) : rows;
}

export function isFollowing(type: FollowTargetType, id: string): boolean {
  if (!id) return false;
  const k = keyOf(type, id);
  return readFollows().some((r) => keyOf(r.targetType, r.targetId) === k);
}

export function toggleFollow(input: {
  targetType: FollowTargetType;
  targetId: string;
  label?: string;
}): boolean {
  if (!input.targetId || typeof window === "undefined") return false;
  const rows = readFollows();
  const k = keyOf(input.targetType, input.targetId);
  const idx = rows.findIndex((r) => keyOf(r.targetType, r.targetId) === k);
  if (idx >= 0) {
    rows.splice(idx, 1);
    writeFollows(rows);
    return false;
  }
  rows.unshift({
    targetType: input.targetType,
    targetId: input.targetId,
    label: input.label,
    createdAt: new Date().toISOString(),
  });
  writeFollows(rows);
  return true;
}
