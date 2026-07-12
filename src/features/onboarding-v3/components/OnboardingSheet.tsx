"use client";

import { useRef, type ReactNode } from "react";
import { useModalA11y } from "@/design-system/hooks/useModalA11y";
import { pickBilingualLabel } from "@/lib/i18n/pick-label";
import { useLanguage } from "@/providers/LanguageProvider";
import { OnboardingProgress } from "./OnboardingProgress";

export type OnboardingSheetProps = {
  open: boolean;
  stepIndex: number;
  totalSteps: number;
  progress: number;
  onSkipStep: () => void;
  children: ReactNode;
};

export function OnboardingSheet({
  open,
  stepIndex,
  totalSteps,
  progress,
  onSkipStep,
  children,
}: OnboardingSheetProps) {
  const { language } = useLanguage();
  const panelRef = useRef<HTMLDivElement>(null);

  useModalA11y({
    open,
    onClose: onSkipStep,
    panelRef,
    restoreFocus: false,
    initialFocusSelector: ".ob-v3__primary, .ob-v3__skip",
  });

  if (!open) return null;

  return (
    <div
      className="ob-v3"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ob-v3-sheet-title"
      aria-describedby="ob-v3-sheet-desc"
    >
      <div className="ob-v3__backdrop" aria-hidden />
      <div ref={panelRef} className="ob-v3__sheet">
        <div className="ob-v3__handle" aria-hidden />
        <header className="ob-v3__sheet-head">
          <p id="ob-v3-sheet-title" className="ob-v3__sheet-brand">
            {pickBilingualLabel(language, "Jan Darpan", "जन दर्पण")}
          </p>
          <p id="ob-v3-sheet-desc" className="ob-v3__sheet-tagline">
            {pickBilingualLabel(
              language,
              "Your Chhattisgarh news, your way",
              "आपकी छत्तीसगढ़ खबर, आपके अनुसार"
            )}
          </p>
          <OnboardingProgress
            stepIndex={stepIndex}
            totalSteps={totalSteps}
            progress={progress}
          />
        </header>
        <div className="ob-v3__sheet-body">{children}</div>
      </div>
    </div>
  );
}
