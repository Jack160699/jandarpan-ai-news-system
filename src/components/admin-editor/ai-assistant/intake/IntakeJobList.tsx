"use client";

import { AlertCircle, Check, Circle, Loader2 } from "lucide-react";
import type { AiIntakeStep } from "../types";

type IntakeJobListProps = {
  steps: AiIntakeStep[];
};

export function IntakeJobList({ steps }: IntakeJobListProps) {
  if (steps.length === 0) return null;

  return (
    <ul className="jd-ai-intake-jobs" aria-live="polite" aria-label="AI intake progress">
      {steps.map((step) => (
        <li
          key={step.id}
          className={`jd-ai-intake-jobs__item jd-ai-intake-jobs__item--${step.status}`}
        >
          <span className="jd-ai-intake-jobs__icon" aria-hidden>
            {step.status === "completed" ? (
              <Check size={14} />
            ) : step.status === "processing" ? (
              <Loader2 size={14} className="spin" />
            ) : step.status === "failed" ? (
              <AlertCircle size={14} />
            ) : (
              <Circle size={14} />
            )}
          </span>
          <span>{step.label}</span>
          <em className="jd-ai-intake-jobs__status">{step.status}</em>
        </li>
      ))}
    </ul>
  );
}
