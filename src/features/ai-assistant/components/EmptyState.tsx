"use client";

import { MessageSquarePlus, Sparkles } from "lucide-react";
import { cn } from "@/design-system/utils/cn";
import { SuggestedQuestions } from "./SuggestedQuestions";
import type { AiSuggestedQuestion } from "../types";

export type EmptyStateProps = {
  onNewChat?: () => void;
  onAskQuestion?: (question: string) => void;
  suggestedQuestions?: AiSuggestedQuestion[];
  className?: string;
};

/**
 * Empty conversation state with onboarding and suggested questions.
 */
export function EmptyState({
  onNewChat,
  onAskQuestion,
  suggestedQuestions = [],
  className,
}: EmptyStateProps) {
  return (
    <div className={cn("ai-v3-empty", className)}>
      <div className="ai-v3-empty__hero" aria-hidden>
        <div className="ai-v3-empty__icon-wrap">
          <Sparkles size={28} />
        </div>
      </div>

      <h2 className="ai-v3-empty__title">Ask Jan Darpan AI</h2>
      <p className="ai-v3-empty__desc">
        Get summaries, timelines, and sourced answers from our newsroom. Your questions stay on this
        device until you connect the live API.
      </p>

      {onNewChat && (
        <button type="button" className="ai-v3-empty__new-btn jds-focus-ring" onClick={onNewChat}>
          <MessageSquarePlus size={16} aria-hidden />
          Start a new chat
        </button>
      )}

      {suggestedQuestions.length > 0 && onAskQuestion && (
        <SuggestedQuestions questions={suggestedQuestions} onSelect={onAskQuestion} />
      )}
    </div>
  );
}
