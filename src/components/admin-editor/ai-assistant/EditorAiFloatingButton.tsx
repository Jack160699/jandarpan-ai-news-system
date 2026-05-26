"use client";

import { Sparkles } from "lucide-react";

type EditorAiFloatingButtonProps = {
  onClick: () => void;
  active?: boolean;
};

export function EditorAiFloatingButton({
  onClick,
  active,
}: EditorAiFloatingButtonProps) {
  return (
    <button
      type="button"
      className={`jd-ai-fab${active ? " is-active" : ""}`}
      onClick={onClick}
      aria-label="Open AI assistant"
      aria-expanded={active}
    >
      <Sparkles size={22} />
      <span>AI</span>
    </button>
  );
}
