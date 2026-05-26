"use client";

import { useCallback, useRef, useState } from "react";
import {
  apiExtractLink,
  apiGenerateCoverImage,
  apiGenerateStory,
  intakeErrorMessage,
} from "./intake-api";
import type {
  AiIntakeMode,
  AiIntakeStep,
  AiStoryDraft,
  EditorAiCallbacks,
  EditorAiContext,
} from "./types";

function stepsForMode(mode: AiIntakeMode): AiIntakeStep[] {
  if (mode === "link") {
    return [
      { id: "1", label: "Extracting article", status: "queued" },
      { id: "2", label: "Writing story", status: "queued" },
    ];
  }
  return [
    { id: "1", label: "Reading input", status: "queued" },
    { id: "2", label: "Writing story", status: "queued" },
  ];
}

function setStepStatus(
  steps: AiIntakeStep[],
  index: number,
  status: AiIntakeStep["status"]
): AiIntakeStep[] {
  return steps.map((s, i) => ({
    ...s,
    status: i < index ? "completed" : i === index ? status : s.status,
  }));
}

export function useAiIntake(
  context: EditorAiContext,
  callbacks: EditorAiCallbacks
) {
  const [intakeMode, setIntakeMode] = useState<AiIntakeMode>("text");
  const [intakePrompt, setIntakePrompt] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [rawText, setRawText] = useState("");
  const [intakeSteps, setIntakeSteps] = useState<AiIntakeStep[]>([]);
  const [draft, setDraft] = useState<AiStoryDraft | null>(null);
  const [isIntakeRunning, setIsIntakeRunning] = useState(false);
  const [isCoverRunning, setIsCoverRunning] = useState(false);
  const [intakeError, setIntakeError] = useState<string | null>(null);
  const lastModeRef = useRef<AiIntakeMode>("text");

  const runIntake = useCallback(
    async (mode: AiIntakeMode) => {
      if (isIntakeRunning) return;
      setIntakeError(null);
      setDraft(null);
      lastModeRef.current = mode;

      if (mode === "link" && !linkUrl.trim()) {
        setIntakeError("Paste a URL to continue.");
        return;
      }
      if (mode === "text" && !rawText.trim()) {
        setIntakeError("Paste wire copy, notes, or a draft.");
        return;
      }
      if (mode === "prompt" && !intakePrompt.trim()) {
        setIntakeError("Enter a short brief (angle, facts, language).");
        return;
      }

      setIsIntakeRunning(true);
      let steps = stepsForMode(mode);
      setIntakeSteps(setStepStatus(steps, 0, "processing"));

      try {
        let sourceText: string | undefined;

        if (mode === "link") {
          const extracted = await apiExtractLink(linkUrl.trim());
          if (!extracted.ok) {
            setIntakeError(intakeErrorMessage(extracted.error));
            setIntakeSteps(
              setStepStatus(steps, 0, "failed").map((s, i) =>
                i === 0 ? { ...s, status: "failed" } : s
              )
            );
            return;
          }
          sourceText = extracted.title
            ? `${extracted.title}\n\n${extracted.text}`
            : extracted.text;
          steps = setStepStatus(setStepStatus(steps, 0, "completed"), 1, "processing");
          setIntakeSteps(steps);
        } else {
          steps = setStepStatus(steps, 1, "processing");
          setIntakeSteps(steps);
        }

        const generated = await apiGenerateStory({
          mode,
          context,
          prompt: mode === "prompt" ? intakePrompt : undefined,
          rawText: mode === "text" ? rawText : undefined,
          linkUrl: mode === "link" ? linkUrl.trim() : undefined,
          sourceText,
        });

        if (!generated.ok) {
          setIntakeError(intakeErrorMessage(generated.error));
          setIntakeSteps(
            steps.map((s) =>
              s.status === "processing" ? { ...s, status: "failed" } : s
            )
          );
          return;
        }

        setIntakeSteps(steps.map((s) => ({ ...s, status: "completed" })));
        setDraft(generated.draft);
        callbacks.onToast?.("Story draft ready");
      } catch {
        setIntakeError("Network error — check connection and retry.");
        setIntakeSteps((prev) =>
          prev.map((s) =>
            s.status === "processing" ? { ...s, status: "failed" } : s
          )
        );
      } finally {
        setIsIntakeRunning(false);
      }
    },
    [
      callbacks,
      context,
      intakePrompt,
      isIntakeRunning,
      linkUrl,
      rawText,
    ]
  );

  const retryIntake = useCallback(() => {
    void runIntake(lastModeRef.current);
  }, [runIntake]);

  const generateCover = useCallback(async () => {
    if (!draft || isCoverRunning) return;
    setIsCoverRunning(true);
    setIntakeError(null);
    try {
      const result = await apiGenerateCoverImage({
        headline: draft.headline,
        summary: draft.summary,
      });
      if (!result.ok) {
        setIntakeError(intakeErrorMessage(result.error));
        return;
      }
      setDraft((d) => (d ? { ...d, coverImageUrl: result.imageUrl } : d));
      callbacks.onToast?.("Cover image ready");
    } catch {
      setIntakeError("Cover request failed — retry.");
    } finally {
      setIsCoverRunning(false);
    }
  }, [callbacks, draft, isCoverRunning]);

  const applyDraft = useCallback(
    (target: AiStoryDraft) => {
      if (callbacks.onApplyStoryDraft) {
        callbacks.onApplyStoryDraft(target);
        callbacks.onToast?.("Inserted into editor");
        return;
      }
      callbacks.onUpdateHeadline(target.headline);
      callbacks.onUpdateSummary(target.summary);
      callbacks.onUpdateTags(target.tags);
      callbacks.onInsertBody(target.body);
      callbacks.onToast?.("Inserted into editor");
    },
    [callbacks]
  );

  const clearDraft = useCallback(() => {
    setDraft(null);
    setIntakeSteps([]);
    setIntakeError(null);
  }, []);

  return {
    intakeMode,
    setIntakeMode,
    intakePrompt,
    setIntakePrompt,
    linkUrl,
    setLinkUrl,
    rawText,
    setRawText,
    intakeSteps,
    draft,
    isIntakeRunning,
    isCoverRunning,
    intakeError,
    runIntake,
    retryIntake,
    generateCover,
    applyDraft,
    clearDraft,
  };
}
