"use client";

import { useCallback, useEffect, useState } from "react";
import { createAiId, readStorage, writeStorage } from "./lib/browser-safe";
import {
  getQuickActionLabel,
  runMockAiGeneration,
} from "./mock-ai";
import type {
  AiAsset,
  AiAssistantTab,
  AiHistoryEntry,
  AiQuickActionId,
  AiResponse,
  AiTask,
  EditorAiCallbacks,
  EditorAiContext,
} from "./types";

const DESKTOP_OPEN_KEY = "jd-ai-assistant-open";

export function useAiAssistant(
  context: EditorAiContext,
  callbacks: EditorAiCallbacks
) {
  const [activeTab, setActiveTab] = useState<AiAssistantTab>("intake");
  const [prompt, setPrompt] = useState("");
  const [tasks, setTasks] = useState<AiTask[]>([]);
  const [responses, setResponses] = useState<AiResponse[]>([]);
  const [history, setHistory] = useState<AiHistoryEntry[]>([]);
  const [assets, setAssets] = useState<AiAsset[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [desktopOpen, setDesktopOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const stored = readStorage(DESKTOP_OPEN_KEY);
    if (stored === "0") setDesktopOpen(false);
  }, []);

  const setDesktopOpenPersisted = useCallback((open: boolean) => {
    setDesktopOpen(open);
    writeStorage(DESKTOP_OPEN_KEY, open ? "1" : "0");
  }, []);

  const generate = useCallback(
    async (actionId?: AiQuickActionId, overridePrompt?: string) => {
      if (isGenerating) return;
      const userPrompt = (overridePrompt ?? prompt).trim();
      const actionLabel = actionId
        ? getQuickActionLabel(actionId)
        : userPrompt || "Custom prompt";

      setIsGenerating(true);
      setTasks([]);
      setActiveTab("chat");

      try {
        const response = await runMockAiGeneration({
          prompt: userPrompt,
          actionId,
          context,
          onTaskUpdate: setTasks,
        });

        setResponses((prev) => [response, ...prev].slice(0, 20));
        setHistory((prev) =>
          [
            {
              id: response.id,
              prompt: userPrompt || actionLabel,
              actionLabel,
              createdAt: response.createdAt,
            },
            ...prev,
          ].slice(0, 30)
        );

        if (response.kind === "headlines" || response.kind === "social") {
          setAssets((prev) =>
            [
              {
                id: response.id,
                label: response.title,
                type: response.kind === "headlines" ? "headline" : "social",
                preview: response.items?.[0] ?? response.content,
                createdAt: response.createdAt,
              },
              ...prev,
            ].slice(0, 25)
          );
        }

        callbacks.onToast?.("AI suggestion ready");
      } finally {
        setIsGenerating(false);
        setTimeout(() => setTasks([]), 1200);
      }
    },
    [callbacks, context, isGenerating, prompt]
  );

  const applyResponse = useCallback(
    (response: AiResponse, item?: string) => {
      if (response.kind === "body" || response.actionId === "rewrite" || response.actionId === "translate") {
        callbacks.onInsertBody(response.content);
        callbacks.onToast?.("Inserted into editor");
        return;
      }
      if (response.kind === "headlines" && item) {
        callbacks.onUpdateHeadline(item);
        callbacks.onToast?.("Headline updated");
        return;
      }
      if (response.kind === "tags" && response.items?.length) {
        callbacks.onUpdateTags(response.items);
        callbacks.onToast?.("Tags applied");
        return;
      }
      if (response.kind === "social") {
        setAssets((prev) =>
          [
            {
              id: createAiId(),
              label: "Social post",
              type: "social",
              preview: response.content,
              createdAt: new Date().toISOString(),
            },
            ...prev,
          ].slice(0, 25)
        );
        callbacks.onToast?.("Saved to assets");
        return;
      }
      if (response.kind === "text" && response.actionId === "summarize") {
        callbacks.onUpdateSummary(response.content);
        callbacks.onToast?.("Summary updated");
        return;
      }
      callbacks.onToast?.("Copied to chat — use Insert for body drafts");
    },
    [callbacks]
  );

  return {
    activeTab,
    setActiveTab,
    prompt,
    setPrompt,
    tasks,
    responses,
    history,
    assets,
    isGenerating,
    desktopOpen,
    setDesktopOpen: setDesktopOpenPersisted,
    mobileOpen,
    setMobileOpen,
    generate,
    applyResponse,
  };
}
