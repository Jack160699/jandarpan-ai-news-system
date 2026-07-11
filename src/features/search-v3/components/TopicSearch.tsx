"use client";

import { Tag } from "lucide-react";
import { SectionHeader } from "@/design-system/components/SectionHeader";
import { Chip } from "@/design-system/components/Chip";
import { useLanguage } from "@/providers/LanguageProvider";
import { pickBilingualLabel } from "@/lib/i18n/pick-label";
import { SEARCH_V3_TOPICS } from "../constants";

type TopicSearchProps = {
  onSelect: (query: string) => void;
};

export function TopicSearch({ onSelect }: TopicSearchProps) {
  const { language, t } = useLanguage();

  return (
    <section className="search-v3__section" aria-labelledby="search-v3-topics">
      <SectionHeader
        title={t.nav.categoriesTitle}
        kicker={t.search.hint}
      />
      <div
        className="search-v3__chip-list search-v3__chip-list--wrap"
        role="group"
        aria-label={t.nav.categoriesTitle}
        id="search-v3-topics"
      >
        {SEARCH_V3_TOPICS.map((topic) => {
          const label = pickBilingualLabel(
            language,
            topic.label,
            topic.labelHi ?? topic.label
          );
          if (topic.href) {
            return (
              <Chip key={topic.id} href={topic.href}>
                <Tag size={14} aria-hidden className="search-v3__chip-icon" />
                {label}
              </Chip>
            );
          }
          return (
            <Chip key={topic.id} onClick={() => onSelect(topic.query)}>
              <Tag size={14} aria-hidden className="search-v3__chip-icon" />
              {label}
            </Chip>
          );
        })}
      </div>
    </section>
  );
}
