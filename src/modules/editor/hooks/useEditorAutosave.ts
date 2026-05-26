"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  persistArticleDraft,
  type AutosaveReason,
} from "@/modules/editor/lib/autosave-engine";
import { queryKeys } from "@/lib/query/query-keys";

const DEBOUNCE_MS = 1_500;
const SAFETY_INTERVAL_MS = 30_000;

export type EditorSaveState = "idle" | "saving" | "saved" | "error";

export function useEditorAutosave(
  articleId: string,
  payload: Record<string, unknown> | null
) {
  const [saveState, setSaveState] = useState<EditorSaveState>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const lastSerializedRef = useRef("");
  const debounceRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({
      body,
      reason,
    }: {
      body: Record<string, unknown>;
      reason: AutosaveReason;
    }) => persistArticleDraft(articleId, body, reason),
    onMutate: () => setSaveState("saving"),
    onSuccess: (result) => {
      if (result.ok) {
        setSaveState("saved");
        setLastSavedAt(result.savedAt);
        void queryClient.invalidateQueries({
          queryKey: queryKeys.editorial.article(articleId),
        });
        window.setTimeout(() => setSaveState("idle"), 1_400);
      } else {
        setSaveState("error");
      }
    },
    onError: () => setSaveState("error"),
  });

  const save = useCallback(
    (reason: AutosaveReason, force = false) => {
      if (!payload) return;
      const serialized = JSON.stringify(payload);
      if (!force && serialized === lastSerializedRef.current) return;
      lastSerializedRef.current = serialized;
      mutation.mutate({ body: payload, reason });
    },
    [payload, mutation]
  );

  useEffect(() => {
    if (!payload) return;
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => save("debounced"), DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [payload, save]);

  useEffect(() => {
    const id = window.setInterval(() => save("interval"), SAFETY_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [save]);

  return {
    saveState,
    lastSavedAt,
    saveNow: () => save("manual", true),
    isSaving: mutation.isPending,
  };
}
