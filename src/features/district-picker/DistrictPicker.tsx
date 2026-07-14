"use client";

import { useMemo, useState } from "react";
import { Check, ChevronRight, MapPin, Search } from "lucide-react";
import { CG_DISTRICTS } from "@/lib/regional/districts";
import { triggerHaptic } from "@/lib/mobile/haptics";
import { pickBilingualLabel } from "@/lib/i18n/pick-label";
import { useLanguage } from "@/providers/LanguageProvider";
import { useReaderPreferences } from "@/providers/ReaderPreferencesProvider";

export function DistrictPicker() {
  const { language } = useLanguage();
  const { prefs, setHomeDistrict } = useReaderPreferences();
  const [query, setQuery] = useState("");
  const [selectingSlug, setSelectingSlug] = useState<string | null>(null);
  const current = prefs.homeDistrict ?? "raipur";

  const districts = useMemo(() => {
    const value = query.trim().toLocaleLowerCase();
    if (!value) return CG_DISTRICTS;
    return CG_DISTRICTS.filter((district) =>
      [district.name, district.nameHi, ...district.aliases]
        .join(" ")
        .toLocaleLowerCase()
        .includes(value)
    );
  }, [query]);

  const chooseDistrict = (slug: string) => {
    if (selectingSlug) return;
    triggerHaptic("medium");
    setSelectingSlug(slug);
    setHomeDistrict(slug);
  };

  return (
    <main className="district-picker" data-testid="district-picker">
      <header className="district-picker__hero">
        <span className="district-picker__eyebrow">
          <MapPin size={15} aria-hidden />
          {pickBilingualLabel(language, "Your local edition", "आपका स्थानीय संस्करण")}
        </span>
        <h1>{pickBilingualLabel(language, "Choose your district", "अपना जिला चुनें")}</h1>
        <p>
          {pickBilingualLabel(
            language,
            "Your selection opens a district-first feed and personalizes local stories across Jan Darpan.",
            "चुना हुआ जिला स्थानीय खबरों का अलग फीड खोलेगा और जन दर्पण को आपके लिए निजी बनाएगा।"
          )}
        </p>
      </header>

      <label className="district-picker__search">
        <Search size={18} aria-hidden />
        <span className="sr-only">
          {pickBilingualLabel(language, "Search districts", "जिला खोजें")}
        </span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={pickBilingualLabel(language, "Search district", "जिला खोजें")}
        />
      </label>

      <div className="district-picker__grid">
        {districts.map((district) => {
          const active = current === district.slug;
          const selecting = selectingSlug === district.slug;
          return (
            <a
              key={district.slug}
              href={`/district/${district.slug}`}
              className={`district-picker__card${active ? " is-active" : ""}${selecting ? " is-selecting" : ""}`}
              aria-current={active ? "page" : undefined}
              onClick={() => chooseDistrict(district.slug)}
            >
              <span className="district-picker__pin" aria-hidden>
                {active || selecting ? <Check size={17} /> : <MapPin size={17} />}
              </span>
              <span className="district-picker__name">
                <strong>{pickBilingualLabel(language, district.name, district.nameHi)}</strong>
                <small>{district.name}</small>
              </span>
              <ChevronRight className="district-picker__arrow" size={18} aria-hidden />
            </a>
          );
        })}
      </div>

      {districts.length === 0 ? (
        <p className="district-picker__empty">
          {pickBilingualLabel(language, "No matching district found.", "कोई मिलता हुआ जिला नहीं मिला।")}
        </p>
      ) : null}
      <p className="sr-only" aria-live="polite">
        {selectingSlug
          ? pickBilingualLabel(language, "Opening district edition", "जिला संस्करण खुल रहा है")
          : ""}
      </p>
    </main>
  );
}
