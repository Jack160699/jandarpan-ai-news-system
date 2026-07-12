"use client";

import { Tags } from "lucide-react";
import { Chip } from "@/design-system/components/Chip";
import { EmptyState } from "@/design-system/components/EmptyState";
import { FEED_INTERESTS } from "@/lib/personalization/interests";
import { pickBilingualLabel } from "@/lib/i18n/pick-label";
import { useLanguage } from "@/providers/LanguageProvider";
import { useReaderAccount } from "@/providers/ReaderAccountProvider";
import { ProfileSection } from "./ProfileSection";
import type { ProfileV3Data } from "../types";

export type FollowedTopicsSectionProps = {
  data: ProfileV3Data;
};

export function FollowedTopicsSection({ data }: FollowedTopicsSectionProps) {
  const { language } = useLanguage();
  const { toggleInterest } = useReaderAccount();
  const showHi = language !== "en";

  return (
    <ProfileSection
      id="followed-topics"
      kicker={pickBilingualLabel(language, "Interests", "रुचियाँ")}
      title={pickBilingualLabel(language, "Followed topics", "फॉलो किए विषय")}
      description={pickBilingualLabel(
        language,
        "Topics you follow shape your homepage and recommendations.",
        "आपके फॉलो किए विषय होमपेज और सुझावों को आकार देते हैं।"
      )}
      action={<Tags size={18} className="pv3-section-icon" aria-hidden />}
    >
      {data.interests.length === 0 ? (
        <EmptyState
          title={pickBilingualLabel(language, "No topics followed", "कोई विषय फॉलो नहीं")}
          description={pickBilingualLabel(
            language,
            "Select topics below to personalize your feed.",
            "फीड पर्सनलाइज़ करने के लिए नीचे विषय चुनें।"
          )}
          icon="🏷️"
        />
      ) : null}

      <div
        className="pv3-chips"
        role="group"
        aria-label={pickBilingualLabel(language, "Topic interests", "विषय रुचियाँ")}
      >
        {FEED_INTERESTS.map((interest) => {
          const selected = data.interests.includes(interest.id);
          const label = showHi ? interest.labelHi : interest.labelEn;
          return (
            <Chip
              key={interest.id}
              selected={selected}
              onClick={() => toggleInterest(interest.id)}
              aria-label={pickBilingualLabel(
                language,
                selected ? `Unfollow ${interest.labelEn}` : `Follow ${interest.labelEn}`,
                selected ? `${interest.labelHi} अनफॉलो` : `${interest.labelHi} फॉलो`
              )}
            >
              {label}
            </Chip>
          );
        })}
      </div>
    </ProfileSection>
  );
}
