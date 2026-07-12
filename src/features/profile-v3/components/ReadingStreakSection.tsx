"use client";

import { Flame } from "lucide-react";
import { EmptyState } from "@/design-system/components/EmptyState";
import { pickBilingualLabel } from "@/lib/i18n/pick-label";
import { useLanguage } from "@/providers/LanguageProvider";
import { ProfileSection } from "./ProfileSection";
import type { ProfileV3Data } from "../types";

export type ReadingStreakSectionProps = {
  data: ProfileV3Data;
};

export function ReadingStreakSection({ data }: ReadingStreakSectionProps) {
  const { language } = useLanguage();

  const streakLabel = pickBilingualLabel(
    language,
    data.streakDays === 1 ? "day" : "days",
    data.streakDays === 1 ? "दिन" : "दिन"
  );

  return (
    <ProfileSection
      id="reading-streak"
      kicker={pickBilingualLabel(language, "Habit", "आदत")}
      title={pickBilingualLabel(language, "Reading streak", "पढ़ने की लकीर")}
      description={pickBilingualLabel(
        language,
        "Visit Jan Darpan daily to build your reading streak on this device.",
        "रोज़ आकर इस डिवाइस पर अपनी पढ़ने की लकीर बनाएं।"
      )}
      action={<Flame size={18} className="pv3-section-icon" aria-hidden />}
    >
      {data.streakDays <= 0 ? (
        <EmptyState
          title={pickBilingualLabel(language, "Start your streak", "लकीर शुरू करें")}
          description={pickBilingualLabel(
            language,
            "Read a story today to begin tracking your daily habit.",
            "आज एक खबर पढ़कर अपनी दैनिक आदत ट्रैक करें।"
          )}
          icon="🔥"
        />
      ) : (
        <div className="pv3-streak" role="status">
          <div className="pv3-streak__flame" aria-hidden>
            <Flame size={40} strokeWidth={1.5} />
          </div>
          <p className="pv3-streak__count">
            <span className="pv3-streak__number">{data.streakDays}</span>
            <span className="pv3-streak__unit">{streakLabel}</span>
          </p>
          <p className="pv3-streak__message">
            {data.streakDays >= 7
              ? pickBilingualLabel(
                  language,
                  "Great consistency — keep it going!",
                  "बढ़िया नियमितता — जारी रखें!"
                )
              : pickBilingualLabel(
                  language,
                  "Come back tomorrow to extend your streak.",
                  "कल वापस आकर लकीर बढ़ाएं।"
                )}
          </p>
          <div
            className="pv3-streak__dots"
            aria-label={pickBilingualLabel(language, "Weekly progress", "साप्ताहिक प्रगति")}
          >
            {Array.from({ length: 7 }, (_, i) => (
              <span
                key={i}
                className={`pv3-streak__dot${i < Math.min(data.streakDays, 7) ? " is-filled" : ""}`}
                aria-hidden
              />
            ))}
          </div>
        </div>
      )}
    </ProfileSection>
  );
}
