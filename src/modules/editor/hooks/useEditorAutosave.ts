"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  persistArticleDraft,
  type AutosaveReason,
} from "@/modules/editor/lib/autosave-engine";
import { traceRemount } from "@/lib/observability/remount-trace";
import { traceEditorLifecycle } from "@/lib/observability/editor-lifecycle-trace";

const DEBOUNCE_MS = 1_500;
const SAFETY_INTERVAL_MS = 30_000;

export type EditorSaveState = "idle" | "saving" | "saved" | "error";

export function useEditorAutosave(
  articleId: string,
  payload: Record<string, unknown> | null
) {
  const [saveState, setSaveState] = useState<EditorSaveState>("idle");
  const isMountedRef = useRef(true);
  const activeAbortRef = useRef<AbortController | null>(null);
  const idleTimeoutRef = useRef<ReturnType<typeof window.setTimeout> | null>(
    null
  );
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const lastSerializedRef = useRef("");
  const debounceRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);
  const payloadRef = useRef(payload);
  payloadRef.current = payload;

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      activeAbortRef.current?.abort();
      activeAbortRef.current = null;
      if (idleTimeoutRef.current) {
        window.clearTimeout(idleTimeoutRef.current);
        idleTimeoutRef.current = null;
      }
      traceEditorLifecycle("AUTOSAVE_CANCEL", "editor_autosave_unmount_cancel");
    };
  }, []);

  const mutation = useMutation({
    mutationFn: async ({
      body,
      reason,
      signal,
    }: {
      body: Record<string, unknown>;
      reason: AutosaveReason;
      signal?: AbortSignal;
    }) => persistArticleDraft(articleId, body, reason, signal),
    onMutate: () => setSaveState("saving"),
    onSuccess: (result) => {
      if (!isMountedRef.current) return;
      if (result.ok) {
        setSaveState("saved");
        setLastSavedAt(result.savedAt);
        // Do NOT invalidate article query — that refetches and can remount/hydrate the editor.
        if (idleTimeoutRef.current) window.clearTimeout(idleTimeoutRef.current);
        idleTimeoutRef.current = window.setTimeout(() => {
          if (!isMountedRef.current) return;
          setSaveState("idle");
        }, 1_400);
      } else {
        if (result.error === "aborted") {
          setSaveState("idle");
          return;
        }
        setSaveState("error");
      }
    },
    onError: (err) => {
      if (!isMountedRef.current) return;
      const isAbort =
        err instanceof DOMException && err.name === "AbortError";
      if (isAbort) {
        traceEditorLifecycle("AUTOSAVE_CANCEL", "editor_autosave_inflight_abort");
        setSaveState("idle");
        return;
      }
      setSaveState("error");
    },
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
    // Cancel any previous in-flight autosave to avoid overlap + reduce load on mobile.
    if (activeAbortRef.current) {
      traceEditorLifecycle("AUTOSAVE_CANCEL", "editor_autosave_overlap_cancel");
      activeAbortRef.current.abort();
    }
    const controller = new AbortController();
    activeAbortRef.current = controller;
    mutateRef.current({ body, reason, signal: controller.signal });
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
