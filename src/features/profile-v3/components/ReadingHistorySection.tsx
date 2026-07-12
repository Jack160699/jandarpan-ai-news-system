"use client";

import Link from "next/link";
import { History } from "lucide-react";
import { EmptyState } from "@/design-system/components/EmptyState";
import { pickBilingualLabel } from "@/lib/i18n/pick-label";
import { useLanguage } from "@/providers/LanguageProvider";
import { ProfileSection } from "./ProfileSection";
import { useProfileV3Prefs } from "../hooks/useProfileV3Prefs";
import type { ProfileV3Data } from "../types";

export type ReadingHistorySectionProps = {
  data: ProfileV3Data;
};

export function ReadingHistorySection({ data }: ReadingHistorySectionProps) {
  const { language, t } = useLanguage();
  const { prefs } = useProfileV3Prefs();

  const description = pickBilingualLabel(
    language,
    "Continue where you left off. Progress is saved on this device.",
    "जहाँ छोड़ा था वहीं से पढ़ें। प्रगति इस डिवाइस पर सहेजी जाती है।"
  );

  return (
    <ProfileSection
      id="reading-history"
      kicker={pickBilingualLabel(language, "History", "इतिहास")}
      title={pickBilingualLabel(language, "Reading history", "पढ़ने का इतिहास")}
      description={description}
      action={<History size={18} className="pv3-section-icon" aria-hidden />}
    >
      {!prefs.showReadingHistory ? (
        <EmptyState
          title={pickBilingualLabel(language, "History hidden", "इतिहास छिपा है")}
          description={pickBilingualLabel(
            language,
            "Enable reading history in Privacy settings to see stories here.",
            "यहाँ खबरें देखने के लिए गोपनीयता सेटिंग में पढ़ने का इतिहास चालू करें।"
          )}
          icon="◌"
        />
      ) : !data.continueTarget && data.history.length === 0 ? (
        <EmptyState
          title={pickBilingualLabel(language, "No reading history yet", "अभी कोई इतिहास नहीं")}
          description={pickBilingualLabel(
            language,
            "Stories you read will appear here so you can pick up where you left off.",
            "आप जो खबरें पढ़ेंगे वे यहाँ दिखेंगी।"
          )}
          icon="📖"
        >
          <Link href="/" className="jds-button jds-button--outline jds-button--sm">
            {t.archive.backToEdition}
          </Link>
        </EmptyState>
      ) : (
        <div className="pv3-history">
          {data.continueTarget ? (
            <article className="pv3-history__featured">
              <p className="pv3-history__kicker">{t.ribbon.continue}</p>
              <Link href={data.continueTarget.href} className="pv3-history__title">
                {data.continueTarget.label}
              </Link>
              <div
                className="pv3-progress"
                role="progressbar"
                aria-valuenow={Math.round(data.continueTarget.progress * 100)}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className="pv3-progress__bar"
                  style={{ width: `${Math.round(data.continueTarget.progress * 100)}%` }}
                />
              </div>
            </article>
          ) : null}

          {data.continueList.length > 1 ? (
            <ul className="pv3-history__quick" aria-label={t.ribbon.continue}>
              {data.continueList.slice(1).map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="pv3-history__quick-link">
                    {item.label}
                  </Link>
                  <span className="pv3-history__pct">
                    {Math.round(item.progress * 100)}%
                  </span>
                </li>
              ))}
            </ul>
          ) : null}

          {data.history.length > 0 ? (
            <ul className="pv3-history__list" aria-label={description}>
              {data.history.map((item) => (
                <li key={item.slug} className="pv3-history__item">
                  <Link href={`/story/${item.slug}`} className="pv3-history__link">
                    {item.title}
                  </Link>
                  <span className="pv3-history__meta">
                    {Math.round(item.progress * 100)}%{" "}
                    {pickBilingualLabel(language, "read", "पढ़ा")}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      )}
    </ProfileSection>
  );
}
