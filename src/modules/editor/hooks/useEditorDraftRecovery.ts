"use client";

import { useEffect, useState } from "react";
import {
  hasConflict,
  readLocalDraft,
  type LocalDraftSnapshot,
} from "@/modules/editor/lib/draft-storage";
import type { EditorArticleRecord } from "@/lib/editorial-editor/types";
import { tracePerf } from "@/lib/observability/performance-monitor";

export function useEditorDraftRecovery(
  articleId: string,
  serverArticle: EditorArticleRecord | null | undefined
) {
  const [localDraft, setLocalDraft] = useState<LocalDraftSnapshot | null>(null);
  const [conflict, setConflict] = useState(false);

  useEffect(() => {
    const local = readLocalDraft(articleId);
    setLocalDraft(local);
    const conflictDetected = hasConflict(serverArticle ?? null, local);
    setConflict(conflictDetected);
    if (conflictDetected) {
      tracePerf("EDITOR", "draft_conflict_detected", { articleId });
    }
  }, [articleId, serverArticle]);

  return { localDraft, conflict, clearConflict: () => setConflict(false) };
}
