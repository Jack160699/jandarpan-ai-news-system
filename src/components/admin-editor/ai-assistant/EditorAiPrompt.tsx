"use client";

import { Loader2, Sparkles } from "lucide-react";

type EditorAiPromptProps = {
  prompt: string;
  onPromptChange: (value: string) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  compact?: boolean;
};

export function EditorAiPrompt({
  prompt,
  onPromptChange,
  onGenerate,
  isGenerating,
  compact,
}: EditorAiPromptProps) {
  return (
    <div className={`jd-ai-prompt${compact ? " jd-ai-prompt--compact" : ""}`}>
      <label className="jd-ai-prompt__label" htmlFor="jd-ai-prompt-input">
        Ask the desk assistant
      </label>
      <textarea
        id="jd-ai-prompt-input"
        className="jd-ai-prompt__input"
        rows={compact ? 2 : 3}
        placeholder="e.g. Tighten the lede, add a local angle, or suggest a headline…"
        value={prompt}
        onChange={(e) => onPromptChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            onGenerate();
          }
        }}
        disabled={isGenerating}
      />
      <button
        type="button"
        className="jd-ai-prompt__generate anr-btn anr-btn--primary"
        disabled={isGenerating}
        onClick={onGenerate}
      >
        {isGenerating ? (
          <>
            <Loader2 size={14} className="spin" /> Working…
          </>
        ) : (
          <>
            <Sparkles size={14} /> Generate
          </>
        )}
      </button>
      <p className="jd-ai-prompt__hint">Ctrl+Enter to generate</p>
    </div>
  );
}
