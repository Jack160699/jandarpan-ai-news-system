"use client";

import { pickBilingualLabel } from "@/lib/i18n/pick-label";
import { useLanguage } from "@/providers/LanguageProvider";
import { OnboardingStepFrame } from "../components/OnboardingStepFrame";

export type WelcomeStepProps = {
  onContinue: () => void;
  onSkip: () => void;
};

export function WelcomeStep({ onContinue, onSkip }: WelcomeStepProps) {
  const { language } = useLanguage();

  return (
    <OnboardingStepFrame
      stepId="welcome"
      kicker={pickBilingualLabel(language, "Welcome", "स्वागत")}
      title={pickBilingualLabel(
        language,
        "News that knows your district",
        "खबरें जो आपके जिले को जानती हैं"
      )}
      subtitle={pickBilingualLabel(
        language,
        "Set up Jan Darpan in under a minute — local headlines, topics you care about, and alerts when it matters.",
        "एक मिनट में जन दर्पण सेट करें — स्थानीय सुर्खियाँ, पसंदीदा विषय और ज़रूरी अलर्ट।"
      )}
      primaryLabel={pickBilingualLabel(language, "Get started", "शुरू करें")}
      onPrimary={onContinue}
      onSkip={onSkip}
    >
      <ul className="ob-v3__feature-list" aria-label={pickBilingualLabel(language, "What you get", "आपको क्या मिलेगा")}>
        <li className="ob-v3__feature">
          <span className="ob-v3__feature-icon" aria-hidden>
            📍
          </span>
          <span>
            {pickBilingualLabel(
              language,
              "District-first homepage",
              "जिला-केंद्रित होमपेज"
            )}
          </span>
        </li>
        <li className="ob-v3__feature">
          <span className="ob-v3__feature-icon" aria-hidden>
            ✨
          </span>
          <span>
            {pickBilingualLabel(
              language,
              "Topics tuned to you",
              "आपके लिए चुने गए विषय"
            )}
          </span>
        </li>
        <li className="ob-v3__feature">
          <span className="ob-v3__feature-icon" aria-hidden>
            🔔
          </span>
          <span>
            {pickBilingualLabel(
              language,
              "Breaking alerts when you want them",
              "जब चाहें ब्रेकिंग अलर्ट"
            )}
          </span>
        </li>
      </ul>
    </OnboardingStepFrame>
  );
}
