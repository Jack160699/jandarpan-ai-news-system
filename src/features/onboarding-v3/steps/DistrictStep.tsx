"use client";

import { CG_DISTRICTS } from "@/lib/regional/districts";
import { pickBilingualLabel } from "@/lib/i18n/pick-label";
import { useLanguage } from "@/providers/LanguageProvider";
import { useReaderPreferences } from "@/providers/ReaderPreferencesProvider";
import { Chip } from "@/design-system";
import { OnboardingStepFrame } from "../components/OnboardingStepFrame";

const DISTRICT_OPTIONS = CG_DISTRICTS.filter((district) => district.priority <= 2).slice(0, 12);

export type DistrictStepProps = {
  onContinue: () => void;
  onSkip: () => void;
};

export function DistrictStep({ onContinue, onSkip }: DistrictStepProps) {
  const { language } = useLanguage();
  const { prefs, setHomeDistrict } = useReaderPreferences();
  const selected = prefs.homeDistrict ?? "raipur";

  return (
    <OnboardingStepFrame
      stepId="district"
      kicker={pickBilingualLabel(language, "Your district", "आपका जिला")}
      title={pickBilingualLabel(
        language,
        "Where should we start?",
        "हम कहाँ से शुरू करें?"
      )}
      subtitle={pickBilingualLabel(
        language,
        "Pick your home district for local headlines and hyperlocal coverage.",
        "स्थानीय सुर्खियों के लिए अपना होम जिला चुनें।"
      )}
      primaryLabel={pickBilingualLabel(language, "Continue", "जारी रखें")}
      onPrimary={onContinue}
      onSkip={onSkip}
    >
      <div className="ob-v3__chips" role="group" aria-label={pickBilingualLabel(language, "Districts", "जिले")}>
        {DISTRICT_OPTIONS.map((district) => (
          <Chip
            key={district.slug}
            selected={selected === district.slug}
            onClick={() => setHomeDistrict(district.slug)}
            className="ob-v3__chip"
          >
            {pickBilingualLabel(language, district.name, district.nameHi)}
          </Chip>
        ))}
      </div>
    </OnboardingStepFrame>
  );
}
