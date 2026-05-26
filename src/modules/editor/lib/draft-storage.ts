/**
 * Offline draft recovery — localStorage snapshot per article.
 */

import type { EditorArticleRecord } from "@/lib/editorial-editor/types";

const PREFIX = "jd-editor-draft:";

export type LocalDraftSnapshot = {
  articleId: string;
  payload: Record<string, unknown>;
  savedAt: string;
  serverUpdatedAt?: string | null;
};

export function draftStorageKey(articleId: string): string {
  return `${PREFIX}${articleId}`;
}

export function readLocalDraft(articleId: string): LocalDraftSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(draftStorageKey(articleId));
    if (!raw) return null;
    return JSON.parse(raw) as LocalDraftSnapshot;
  } catch {
    return null;
  }
}

export function writeLocalDraft(snapshot: LocalDraftSnapshot): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(draftStorageKey(snapshot.articleId), JSON.stringify(snapshot));
  } catch {
    /* quota */
  }
}

export function clearLocalDraft(articleId: string): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(draftStorageKey(articleId));
}

export function hasConflict(
  server: EditorArticleRecord | null,
  local: LocalDraftSnapshot | null
): boolean {
  if (!server || !local) return false;
  const serverAt =
    (server.editorial_metadata?.draft_state as { updatedAt?: string } | undefined)
      ?.updatedAt ?? server.created_at;
  if (!serverAt || !local.savedAt) return false;
  return new Date(local.savedAt).getTime() > new Date(serverAt).getTime();
}
