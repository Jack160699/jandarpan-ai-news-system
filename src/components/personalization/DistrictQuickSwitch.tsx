"use client";

import { ChevronRight, MapPin } from "lucide-react";
import { pickBilingualLabel } from "@/lib/i18n/pick-label";
import { getDistrict } from "@/lib/regional/districts";
import { requestDistrictPicker } from "@/layouts/DistrictModal/events";
import { triggerHaptic } from "@/lib/mobile/haptics";
import { useLanguage } from "@/providers/LanguageProvider";
import { useReaderPreferences } from "@/providers/ReaderPreferencesProvider";

/**
 * Canonical homepage entry point for district selection.
 * The persistent preference and the picker itself remain owned by the shell.
 */
export function DistrictQuickSwitch() {
  const { language } = useLanguage();
  const { prefs } = useReaderPreferences();
  const current = getDistrict(prefs.homeDistrict ?? "raipur") ?? getDistrict("raipur");
  const districtLabel = current
    ? pickBilingualLabel(language, current.name, current.nameHi)
    : pickBilingualLabel(language, "Raipur", "रायपुर");

  return (
    <button
      type="button"
      className="hp-district-switch tap-target"
      onClick={() => {
        triggerHaptic("selection");
        requestDistrictPicker();
      }}
      aria-label={pickBilingualLabel(
        language,
        `Change district. ${districtLabel} selected`,
        `जिला बदलें। ${districtLabel} चुना गया है`
      )}
    >
      <span className="hp-district-switch__pin" aria-hidden>
        <MapPin size={17} />
      </span>
      <span className="hp-district-switch__copy">
        <small>{pickBilingualLabel(language, "Your district", "आपका जिला")}</small>
        <strong>{districtLabel}</strong>
      </span>
      <span className="hp-district-switch__change">
        {pickBilingualLabel(language, "Change", "बदलें")}
        <ChevronRight size={16} aria-hidden />
      </span>
    </button>
  );
}
