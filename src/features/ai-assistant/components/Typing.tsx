"use client";

import { Sparkles } from "lucide-react";
import { cn } from "@/design-system/utils/cn";
import { useReducedMotion } from "@/design-system/hooks/useReducedMotion";

export type TypingProps = {
  label?: string;
  className?: string;
};

/**
 * Typing / thinking indicator while awaiting an AI response.
 */
export function Typing({ label = "Jan Darpan AI is thinking", className }: TypingProps) {
  const reducedMotion = useReducedMotion();

  return (
    <div
      className={cn("ai-v3-typing", className)}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <Sparkles size={16} aria-hidden className="ai-v3-typing__icon" />
      <span className="ai-v3-typing__label">{label}</span>
      {!reducedMotion && (
        <span className="ai-v3-typing__dots" aria-hidden>
          <span />
          <span />
          <span />
        </span>
      )}
    </div>
  );
}
