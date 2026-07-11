"use client";

import type { ReactNode } from "react";
import { pickBilingualLabel } from "@/lib/i18n/pick-label";
import { useLanguage } from "@/providers/LanguageProvider";

export type OnboardingStepFrameProps = {
  stepId: string;
  kicker?: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  primaryLabel: string;
  onPrimary: () => void;
  onSkip?: () => void;
  skipLabel?: string;
  primaryDisabled?: boolean;
  hideSkip?: boolean;
};

export function OnboardingStepFrame({
  stepId,
  kicker,
  title,
  subtitle,
  children,
  primaryLabel,
  onPrimary,
  onSkip,
  skipLabel,
  primaryDisabled = false,
  hideSkip = false,
}: OnboardingStepFrameProps) {
  const { language } = useLanguage();

  return (
    <section
      className="ob-v3__step"
      aria-labelledby={`ob-v3-${stepId}-title`}
      data-step={stepId}
    >
      <header className="ob-v3__step-head">
        {kicker ? <p className="ob-v3__kicker">{kicker}</p> : null}
        <h2 id={`ob-v3-${stepId}-title`} className="ob-v3__title">
          {title}
        </h2>
        {subtitle ? <p className="ob-v3__subtitle">{subtitle}</p> : null}
      </header>

      <div className="ob-v3__step-body">{children}</div>

      <footer className="ob-v3__step-actions">
        <button
          type="button"
          className="ob-v3__primary tap-target"
          onClick={onPrimary}
          disabled={primaryDisabled}
        >
          {primaryLabel}
        </button>
        {!hideSkip && onSkip ? (
          <button type="button" className="ob-v3__skip tap-target" onClick={onSkip}>
            {skipLabel ??
              pickBilingualLabel(language, "Skip for now", "अभी छोड़ें")}
          </button>
        ) : null}
      </footer>
    </section>
  );
}
