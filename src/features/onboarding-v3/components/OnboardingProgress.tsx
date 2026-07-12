"use client";

import { pickBilingualLabel } from "@/lib/i18n/pick-label";
import { useLanguage } from "@/providers/LanguageProvider";

export type OnboardingProgressProps = {
  stepIndex: number;
  totalSteps: number;
  progress: number;
};

export function OnboardingProgress({
  stepIndex,
  totalSteps,
  progress,
}: OnboardingProgressProps) {
  const { language } = useLanguage();
  const label = pickBilingualLabel(
    language,
    `Step ${stepIndex + 1} of ${totalSteps}`,
    `चरण ${stepIndex + 1} / ${totalSteps}`
  );

  return (
    <div className="ob-v3__progress" aria-label={label}>
      <div
        className="ob-v3__progress-track"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress}
        aria-label={label}
      >
        <div className="ob-v3__progress-fill" style={{ width: `${progress}%` }} />
      </div>
      <ol className="ob-v3__progress-dots" aria-hidden>
        {Array.from({ length: totalSteps }, (_, index) => (
          <li
            key={index}
            className={`ob-v3__progress-dot${index <= stepIndex ? " is-active" : ""}${
              index === stepIndex ? " is-current" : ""
            }`}
          />
        ))}
      </ol>
      <p className="ob-v3__progress-label">{label}</p>
    </div>
  );
}
