"use client";

import { ChevronRight, Sparkles, X } from "lucide-react";
import { EditorAiTabs } from "./EditorAiTabs";
import { AssetsPanel } from "./panels/AssetsPanel";
import { ChatPanel } from "./panels/ChatPanel";
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

type EditorAiDesktopPanelProps = {
  open: boolean;
  onToggle: () => void;
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

export function EditorAiDesktopPanel({
  open,
  onToggle,
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
}: EditorAiDesktopPanelProps) {
  if (!open) {
    return (
      <button
        type="button"
        className="jd-ai-rail-toggle"
        onClick={onToggle}
        aria-label="Open AI assistant panel"
      >
        <Sparkles size={16} />
        <span>AI</span>
        <ChevronRight size={14} />
      </button>
    );
  }

  return (
    <aside className="jd-ai-panel" aria-label="AI assistant">
      <header className="jd-ai-panel__chrome">
        <div className="jd-ai-panel__title">
          <Sparkles size={16} />
          <span>AI Assistant</span>
        </div>
        <button
          type="button"
          className="jd-ai-panel__close"
          onClick={onToggle}
          aria-label="Collapse AI assistant"
        >
          <X size={16} />
        </button>
      </header>
      <EditorAiTabs active={activeTab} onChange={onTabChange} />
      <div className="jd-ai-panel__scroll" role="tabpanel">
        {activeTab === "intake" ? <IntakePanel {...intake} /> : null}
        {activeTab === "chat" ? (
          <ChatPanel
            prompt={prompt}
            onPromptChange={onPromptChange}
            onGenerate={onGenerate}
            onQuickAction={onQuickAction}
            isGenerating={isGenerating}
            tasks={tasks}
            responses={responses}
            onApply={onApply}
          />
        ) : null}
        {activeTab === "tools" ? (
          <ToolsPanel disabled={isGenerating} onRun={onQuickAction} />
        ) : null}
        {activeTab === "assets" ? <AssetsPanel assets={assets} /> : null}
        {activeTab === "history" ? <HistoryPanel history={history} /> : null}
      </div>
    </aside>
  );
}
