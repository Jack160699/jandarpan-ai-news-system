"use client";

import { cn } from "@/design-system/utils/cn";
import type { AiSuggestedQuestion } from "../types";

export type SuggestedQuestionsProps = {
  questions: AiSuggestedQuestion[];
  onSelect: (question: string) => void;
  className?: string;
};

/**
 * Grid of starter questions shown in the empty state.
 */
export function SuggestedQuestions({ questions, onSelect, className }: SuggestedQuestionsProps) {
  return (
    <section className={cn("ai-v3-suggested", className)} aria-labelledby="ai-v3-suggested-heading">
      <h3 id="ai-v3-suggested-heading" className="ai-v3-suggested__heading">
        Try asking
      </h3>
      <ul className="ai-v3-suggested__list" role="list">
        {questions.map((q) => (
          <li key={q.id}>
            <button
              type="button"
              className="ai-v3-suggested__item jds-focus-ring"
              onClick={() => onSelect(q.question)}
            >
              {q.category && (
                <span className="ai-v3-suggested__category">{q.category}</span>
              )}
              <span className="ai-v3-suggested__text">{q.question}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
