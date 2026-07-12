"use client";

import { Chip } from "@/design-system/components/Chip";
import { useLanguage } from "@/providers/LanguageProvider";
import { pickBilingualLabel } from "@/lib/i18n/pick-label";
import { LIVE_V3_SCOPES } from "../constants";
import type { LiveV3Scope, LiveV3ViewMode } from "../types";

export type LiveFiltersProps = {
  scope: LiveV3Scope;
  viewMode: LiveV3ViewMode;
  onScopeChange: (scope: LiveV3Scope) => void;
  onViewModeChange: (mode: LiveV3ViewMode) => void;
};

export function LiveFilters({
  scope,
  viewMode,
  onScopeChange,
  onViewModeChange,
}: LiveFiltersProps) {
  const { language } = useLanguage();

  return (
    <div className="lv3-filters" role="group" aria-label="Live feed filters">
      <div className="lv3-filters__row">
        {LIVE_V3_SCOPES.map((option) => {
          const label = pickBilingualLabel(
            language,
            option.label,
            option.labelHi
          );
          const selected = scope === option.id;
          return (
            <Chip
              key={option.id}
              selected={selected}
              onClick={() => onScopeChange(selected ? "all" : option.id)}
              aria-pressed={selected}
            >
              {label}
            </Chip>
          );
        })}
      </div>

      <div className="lv3-filters__row lv3-filters__row--view">
        <span className="lv3-filters__view-label">View</span>
        <Chip
          selected={viewMode === "feed"}
          onClick={() => onViewModeChange("feed")}
          aria-pressed={viewMode === "feed"}
        >
          Feed
        </Chip>
        <Chip
          selected={viewMode === "timeline"}
          onClick={() => onViewModeChange("timeline")}
          aria-pressed={viewMode === "timeline"}
        >
          Timeline
        </Chip>
      </div>
    </div>
  );
}
