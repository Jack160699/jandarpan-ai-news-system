"use client";

import { cn } from "@/design-system/utils/cn";
import type { AiPromptSuggestion } from "../types";

export type PromptSuggestionsProps = {
  suggestions: AiPromptSuggestion[];
  onSelect: (prompt: string) => void;
  disabled?: boolean;
  className?: string;
};

/**
 * Horizontal scrollable prompt chips above the input.
 */
export function PromptSuggestions({
  suggestions,
  onSelect,
  disabled,
  className,
}: PromptSuggestionsProps) {
  if (suggestions.length === 0) return null;

  return (
    <div
      className={cn("ai-v3-prompts", className)}
      role="group"
      aria-label="Quick prompt suggestions"
    >
      <div className="ai-v3-prompts__scroll">
        {suggestions.map((s) => (
          <button
            key={s.id}
            type="button"
            className="ai-v3-prompts__chip jds-focus-ring"
            disabled={disabled}
            onClick={() => onSelect(s.prompt)}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}
