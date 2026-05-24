"use client";

import { EmptyState } from "@/components/ui/EmptyState";
import { useTranslation } from "@/providers/LanguageProvider";

/** Client-safe empty state when feed has no renderable lead */
export function HomepageFeedFallback() {
  const { t } = useTranslation();

  return (
    <EmptyState
      className="nr-empty"
      kicker={t.home?.trending ?? "News"}
      title="Stories are loading"
      icon="◌"
      description={
        <p>
          We could not show headlines in your language yet. Pull to refresh or
          switch language from the header.
        </p>
      }
    />
  );
}
