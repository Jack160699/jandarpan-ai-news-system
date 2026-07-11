"use client";

import { Sparkles } from "lucide-react";
import { cn } from "@/design-system/utils/cn";
import { SourceCard } from "./SourceCard";
import { TimelineCard } from "./TimelineCard";
import type { AiAnswer } from "../types";

export type AnswerCardProps = {
  answer: AiAnswer;
  className?: string;
};

/**
 * Assistant answer with optional sources and timeline blocks.
 */
export function AnswerCard({ answer, className }: AnswerCardProps) {
  const hasSources = answer.sources && answer.sources.length > 0;
  const hasTimeline = answer.timeline && answer.timeline.length > 0;

  return (
    <article
      className={cn("ai-v3-answer", className)}
      aria-label="AI assistant response"
    >
      <header className="ai-v3-answer__header">
        <Sparkles size={14} aria-hidden className="ai-v3-answer__icon" />
        <span className="ai-v3-answer__label">Jan Darpan AI</span>
      </header>

      <div className="ai-v3-answer__content">
        <p className="ai-v3-answer__text">{answer.content}</p>
      </div>

      {hasTimeline && <TimelineCard events={answer.timeline!} className="ai-v3-answer__block" />}

      {hasSources && (
        <section className="ai-v3-answer__sources" aria-label="Sources">
          <h4 className="ai-v3-answer__sources-heading">Sources</h4>
          <div className="ai-v3-answer__sources-list">
            {answer.sources!.map((source, i) => (
              <SourceCard key={source.id} source={source} index={i} />
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
