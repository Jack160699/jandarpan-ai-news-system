"use client";

import { FEED_INTERESTS } from "@/lib/personalization/interests";
import { labelForLink } from "@/lib/super-menu/config";
import { pickBilingualLabel } from "@/lib/i18n/pick-label";
import { useLanguage } from "@/providers/LanguageProvider";
import { useReaderAccount } from "@/providers/ReaderAccountProvider";
import { Chip } from "@/design-system";
import { OnboardingStepFrame } from "../components/OnboardingStepFrame";

export type InterestsStepProps = {
  onContinue: () => void;
  onSkip: () => void;
};

export function InterestsStep({ onContinue, onSkip }: InterestsStepProps) {
  const { language } = useLanguage();
  const { interests, toggleInterest } = useReaderAccount();

  return (
    <OnboardingStepFrame
      stepId="interests"
      kicker={pickBilingualLabel(language, "Your feed", "आपकी फ़ीड")}
      title={pickBilingualLabel(
        language,
        "What do you want to read?",
        "आप क्या पढ़ना चाहते हैं?"
      )}
      subtitle={pickBilingualLabel(
        language,
        "Choose a few topics — we'll shape your homepage around them.",
        "कुछ विषय चुनें — हम आपका होमपेज उन्हीं के आसपास बनाएंगे।"
      )}
      primaryLabel={pickBilingualLabel(language, "Continue", "जारी रखें")}
      onPrimary={onContinue}
      onSkip={onSkip}
    >
      <div
        className="ob-v3__chips"
        role="group"
        aria-label={pickBilingualLabel(language, "Topics", "विषय")}
      >
        {FEED_INTERESTS.map((item) => {
          const active = interests.includes(item.id);
          return (
            <Chip
              key={item.id}
              selected={active}
              onClick={() => toggleInterest(item.id)}
              className="ob-v3__chip"
            >
              {labelForLink(item, language)}
            </Chip>
          );
        })}
      </div>
    </OnboardingStepFrame>
  );
}
