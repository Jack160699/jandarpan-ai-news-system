"use client";

import { pickBilingualLabel } from "@/lib/i18n/pick-label";
import { useLanguage } from "@/providers/LanguageProvider";
import { OnboardingStepFrame } from "../components/OnboardingStepFrame";

export type CompleteStepProps = {
  onFinish: () => void;
};

export function CompleteStep({ onFinish }: CompleteStepProps) {
  const { language } = useLanguage();

  return (
    <OnboardingStepFrame
      stepId="complete"
      kicker={pickBilingualLabel(language, "All done", "सब तैयार")}
      title={pickBilingualLabel(
        language,
        "Your Jan Darpan is ready",
        "आपका जन दर्पण तैयार है"
      )}
      subtitle={pickBilingualLabel(
        language,
        "Local headlines, your topics, and alerts are tuned. Dive into today's news.",
        "स्थानीय सुर्खियाँ, आपके विषय और अलर्ट सेट हैं। आज की खबरें पढ़ें।"
      )}
      primaryLabel={pickBilingualLabel(language, "Start reading", "पढ़ना शुरू करें")}
      onPrimary={onFinish}
      hideSkip
    >
      <div className="ob-v3__complete" aria-hidden>
        <span className="ob-v3__complete-icon">✦</span>
      </div>
      <p className="ob-v3__complete-note" role="status">
        {pickBilingualLabel(
          language,
          "You can change district, topics, and alerts anytime from the homepage or menu.",
          "होमपेज या मेनू से कभी भी जिला, विषय और अलर्ट बदल सकते हैं।"
        )}
      </p>
    </OnboardingStepFrame>
  );
}
