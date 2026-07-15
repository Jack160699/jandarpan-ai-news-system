"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, MapPin, Search, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useModalA11y } from "@/design-system/hooks/useModalA11y";
import { triggerHaptic } from "@/lib/mobile/haptics";
import { CG_DISTRICTS } from "@/lib/regional/districts";
import { useLanguage } from "@/providers/LanguageProvider";
import { useNavigation } from "@/providers/NavigationProvider";
import { useReaderPreferences } from "@/providers/ReaderPreferencesProvider";
import { DISTRICT_PICKER_OPEN_EVENT } from "./events";

export function DistrictModal() {
  const { prefs, setHomeDistrict } = useReaderPreferences();
  const { language } = useLanguage();
  const { startNavigation } = useNavigation();
  const panelRef = useRef<HTMLDivElement>(null);
  const [districtOpen, setDistrictOpen] = useState(false);
  const [query, setQuery] = useState("");

  const closeModal = useCallback(() => {
    setQuery("");
    setDistrictOpen(false);
  }, []);

  useEffect(() => {
    const open = () => setDistrictOpen(true);
    window.addEventListener(DISTRICT_PICKER_OPEN_EVENT, open);
    return () => window.removeEventListener(DISTRICT_PICKER_OPEN_EVENT, open);
  }, []);

  useModalA11y({
    open: districtOpen,
    onClose: closeModal,
    panelRef,
    inertSelector: ".jdp-shell",
    initialFocusSelector: ".district-modal__search input",
  });

  const districts = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return CG_DISTRICTS;
    return CG_DISTRICTS.filter((district) =>
      [district.name, district.nameHi, district.slug, ...district.aliases]
        .join(" ")
        .toLowerCase()
        .includes(needle)
    );
  }, [query]);

  if (!districtOpen) return null;

  const isEnglish = language === "en";
  const selectDistrict = (slug: string) => {
    triggerHaptic("success");
    setHomeDistrict(slug);
    closeModal();
    const href = `/district/${slug}`;
    startNavigation(href);
  };

  return (
    <div className="district-modal" role="presentation">
      <button
        type="button"
        className="district-modal__backdrop"
        aria-label={isEnglish ? "Close district picker" : "जिला चयन बंद करें"}
        onClick={closeModal}
      />
      <div
        ref={panelRef}
        className="district-modal__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="district-modal-title"
      >
        <div className="district-modal__glow" aria-hidden />
        <header className="district-modal__header">
          <span className="district-modal__icon" aria-hidden>
            <Sparkles size={18} />
          </span>
          <div>
            <p>{isEnglish ? "Your local edition" : "आपका स्थानीय संस्करण"}</p>
            <h2 id="district-modal-title">
              {isEnglish ? "Choose a district" : "अपना जिला चुनें"}
            </h2>
          </div>
          <button
            type="button"
            className="district-modal__close"
            aria-label={isEnglish ? "Close" : "बंद करें"}
            onClick={closeModal}
          >
            <X size={19} aria-hidden />
          </button>
        </header>

        <label className="district-modal__search">
          <Search size={17} aria-hidden />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={isEnglish ? "Search district" : "जिला खोजें"}
          />
        </label>

        <p className="district-modal__hint">
          {isEnglish
            ? "We auto-select your Chhattisgarh district. Outside the state, Raipur is the default."
            : "छत्तीसगढ़ में आपका जिला अपने-आप चुना जाता है। राज्य के बाहर रायपुर डिफ़ॉल्ट है।"}
        </p>

        <div className="district-modal__grid">
          {districts.map((district) => {
            const active = prefs.homeDistrict === district.slug;
            return (
              <Link
                key={district.slug}
                href={`/district/${district.slug}`}
                className={`district-modal__district${active ? " is-active" : ""}`}
                onClick={() => selectDistrict(district.slug)}
                aria-current={active ? "page" : undefined}
              >
                <MapPin size={16} aria-hidden />
                <span>
                  <strong>{isEnglish ? district.name : district.nameHi}</strong>
                  <small>{isEnglish ? district.nameHi : district.name}</small>
                </span>
                {active ? <Check size={17} aria-hidden /> : null}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
