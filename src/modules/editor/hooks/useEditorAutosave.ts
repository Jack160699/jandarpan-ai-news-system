"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  persistArticleDraft,
  type AutosaveReason,
} from "@/modules/editor/lib/autosave-engine";
import { traceRemount } from "@/lib/observability/remount-trace";

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
  const payloadRef = useRef(payload);
  payloadRef.current = payload;

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
        // Do NOT invalidate article query — that refetches and can remount/hydrate the editor.
        window.setTimeout(() => setSaveState("idle"), 1_400);
      } else {
        setSaveState("error");
      }
    },
    onError: () => setSaveState("error"),
  });

  const mutateRef = useRef(mutation.mutate);
  mutateRef.current = mutation.mutate;

  const save = useCallback((reason: AutosaveReason, force = false) => {
    const body = payloadRef.current;
    if (!body) return;
    const serialized = JSON.stringify(body);
    if (!force && serialized === lastSerializedRef.current) return;
    lastSerializedRef.current = serialized;
    traceRemount("EDITOR_RERENDER", "autosave_dispatch", { reason, articleId });
    mutateRef.current({ body, reason });
  }, [articleId]);

  const payloadSerialized = payload ? JSON.stringify(payload) : "";

  useEffect(() => {
    if (!payloadSerialized) return;
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => save("debounced"), DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [payloadSerialized, save]);

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
