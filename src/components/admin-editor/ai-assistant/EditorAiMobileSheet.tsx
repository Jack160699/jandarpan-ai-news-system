"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { GripHorizontal, X, Sparkles } from "lucide-react";
import { EditorAiTabs } from "./EditorAiTabs";
import { EditorAiPrompt } from "./EditorAiPrompt";
import { EditorAiQuickActions } from "./EditorAiQuickActions";
import { EditorAiTaskList } from "./EditorAiTaskList";
import { EditorAiResponseCard } from "./EditorAiResponseCard";
import { AssetsPanel } from "./panels/AssetsPanel";
import { HistoryPanel } from "./panels/HistoryPanel";
import { ToolsPanel } from "./panels/ToolsPanel";
import { IntakePanel } from "./intake/IntakePanel";
import type { useAiIntake } from "./useAiIntake";
import type {
  AiAsset,
  AiAssistantTab,
  AiHistoryEntry,
  AiQuickActionId,
  AiResponse,
  AiTask,
} from "./types";

type EditorAiMobileSheetProps = {
  open: boolean;
  onClose: () => void;
  activeTab: AiAssistantTab;
  onTabChange: (tab: AiAssistantTab) => void;
  prompt: string;
  onPromptChange: (v: string) => void;
  onGenerate: () => void;
  onQuickAction: (id: AiQuickActionId) => void;
  isGenerating: boolean;
  tasks: AiTask[];
  responses: AiResponse[];
  history: AiHistoryEntry[];
  assets: AiAsset[];
  onApply: (response: AiResponse, item?: string) => void;
  intake: ReturnType<typeof useAiIntake>;
};

const SNAP_HEIGHTS = [0.42, 0.72, 0.92];

export function EditorAiMobileSheet({
  open,
  onClose,
  activeTab,
  onTabChange,
  prompt,
  onPromptChange,
  onGenerate,
  onQuickAction,
  isGenerating,
  tasks,
  responses,
  history,
  assets,
  onApply,
  intake,
}: EditorAiMobileSheetProps) {
  const [snapIndex, setSnapIndex] = useState(1);
  const dragRef = useRef<{ startY: number; startSnap: number } | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || typeof document === "undefined") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (open) setSnapIndex(1);
  }, [open]);

  const onPointerDown = useCallback(
    (e: ReactPointerEvent) => {
      dragRef.current = { startY: e.clientY, startSnap: snapIndex };
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    },
    [snapIndex]
  );

  const onPointerMove = useCallback((e: ReactPointerEvent) => {
    if (!dragRef.current) return;
    const delta = e.clientY - dragRef.current.startY;
    if (delta > 80 && dragRef.current.startSnap > 0) {
      setSnapIndex((i) => Math.max(0, i - 1));
      dragRef.current = null;
    } else if (delta < -80 && dragRef.current.startSnap < SNAP_HEIGHTS.length - 1) {
      setSnapIndex((i) => Math.min(SNAP_HEIGHTS.length - 1, i + 1));
      dragRef.current = null;
    }
  }, []);

  const onPointerUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  if (!open) return null;

  const heightVh = SNAP_HEIGHTS[snapIndex] * 100;

  return (
    <div className="jd-ai-sheet-layer" role="presentation">
      <button
        type="button"
        className="jd-ai-sheet-backdrop"
        aria-label="Close AI assistant"
        onClick={onClose}
      />
      <div
        ref={sheetRef}
        className={`jd-ai-sheet${snapIndex === SNAP_HEIGHTS.length - 1 ? " jd-ai-sheet--fullscreen" : ""}`}
        style={{ height: `${heightVh}vh` }}
        role="dialog"
        aria-modal="true"
        aria-label="AI assistant"
      >
        <div
          className="jd-ai-sheet__handle"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <GripHorizontal size={20} aria-hidden />
        </div>
        <header className="jd-ai-sheet__head">
          <div className="jd-ai-sheet__title">
            <Sparkles size={16} />
            AI Assistant
          </div>
          <button
            type="button"
            className="jd-ai-sheet__close"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </header>
        <EditorAiTabs active={activeTab} onChange={onTabChange} />
        <div className="jd-ai-sheet__body">
          {activeTab === "intake" ? <IntakePanel {...intake} /> : null}
          {activeTab === "chat" ? (
            <>
              <EditorAiPrompt
                prompt={prompt}
                onPromptChange={onPromptChange}
                onGenerate={onGenerate}
                isGenerating={isGenerating}
                compact
              />
              <EditorAiQuickActions
                disabled={isGenerating}
                onAction={onQuickAction}
              />
              <EditorAiTaskList tasks={tasks} />
              <div className="jd-ai-feed">
                {responses.map((r) => (
                  <EditorAiResponseCard
                    key={r.id}
                    response={r}
                    onApply={onApply}
                  />
                ))}
              </div>
            </>
          ) : null}
          {activeTab === "tools" ? (
            <ToolsPanel disabled={isGenerating} onRun={onQuickAction} />
          ) : null}
          {activeTab === "assets" ? <AssetsPanel assets={assets} /> : null}
          {activeTab === "history" ? <HistoryPanel history={history} /> : null}
        </div>
      </div>
    </div>
  );
}
