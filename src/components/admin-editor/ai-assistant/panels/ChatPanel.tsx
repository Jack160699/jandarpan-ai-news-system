"use client";

import { EditorAiPrompt } from "../EditorAiPrompt";
import { EditorAiQuickActions } from "../EditorAiQuickActions";
import { EditorAiResponseCard } from "../EditorAiResponseCard";
import { EditorAiTaskList } from "../EditorAiTaskList";
import type {
  AiQuickActionId,
  AiResponse,
  AiTask,
} from "../types";

type ChatPanelProps = {
  prompt: string;
  onPromptChange: (v: string) => void;
  onGenerate: () => void;
  onQuickAction: (id: AiQuickActionId) => void;
  isGenerating: boolean;
  tasks: AiTask[];
  responses: AiResponse[];
  onApply: (response: AiResponse, item?: string) => void;
};

export function ChatPanel({
  prompt,
  onPromptChange,
  onGenerate,
  onQuickAction,
  isGenerating,
  tasks,
  responses,
  onApply,
}: ChatPanelProps) {
  return (
    <div className="jd-ai-panel-body">
      <EditorAiPrompt
        prompt={prompt}
        onPromptChange={onPromptChange}
        onGenerate={onGenerate}
        isGenerating={isGenerating}
      />
      <EditorAiQuickActions disabled={isGenerating} onAction={onQuickAction} />
      <EditorAiTaskList tasks={tasks} />
      <div className="jd-ai-feed">
        {responses.length === 0 ? (
          <p className="jd-ai-empty">
            Suggestions appear here. Use quick actions or describe what you need.
          </p>
        ) : (
          responses.map((r) => (
            <EditorAiResponseCard key={r.id} response={r} onApply={onApply} />
          ))
        )}
      </div>
    </div>
  );
}
