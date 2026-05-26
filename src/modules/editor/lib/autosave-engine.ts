/**
 * Debounced autosave engine — isolated from React render tree.
 */

import { apiClient } from "@/lib/api/api-client";
import { tracePerf } from "@/lib/observability/performance-monitor";
import { writeLocalDraft, type LocalDraftSnapshot } from "@/modules/editor/lib/draft-storage";

export type AutosaveReason = "manual" | "debounced" | "interval";

export type AutosaveResult =
  | { ok: true; savedAt: string }
  | { ok: false; error: string; status?: number };

export async function persistArticleDraft(
  articleId: string,
  body: Record<string, unknown>,
  reason: AutosaveReason,
  signal?: AbortSignal
): Promise<AutosaveResult> {
  const payload = {
    ...body,
    editorial_metadata: {
      ...(body.editorial_metadata as Record<string, unknown> | undefined),
      draft_state: {
        updatedAt: new Date().toISOString(),
        authoring: true,
        reason,
      },
    },
  };

  tracePerf("EDITOR", "autosave_start", { articleId, reason });
  const result = await apiClient.patch<{ ok?: boolean; versions?: unknown }>(
    `/api/editorial/article/${articleId}`,
    payload,
    { label: "editor_autosave", timeoutMs: 10_000, signal }
  );

  if (!result.ok) {
    // When we cancel in-flight autosaves (unmount / overlap), apiClient can report as timeout.
    if (signal?.aborted) {
      return { ok: false, error: "aborted" };
    }
    tracePerf("EDITOR", "autosave_failed", { status: result.status });
    writeLocalDraft({
      articleId,
      payload,
      savedAt: new Date().toISOString(),
    });
    return { ok: false, error: result.error, status: result.status };
  }

  const savedAt = new Date().toISOString();
  writeLocalDraft({ articleId, payload, savedAt });
  tracePerf("EDITOR", "autosave_done", { articleId, reason });
  return { ok: true, savedAt };
}
