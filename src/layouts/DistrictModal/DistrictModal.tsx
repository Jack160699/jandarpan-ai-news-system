"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, MapPin, Search, X, XCircle } from "lucide-react";
import { useModalA11y } from "@/design-system/hooks/useModalA11y";
import { triggerHaptic } from "@/lib/mobile/haptics";
import {
  CHHATTISGARH_DISTRICT_DIRECTORY,
  type CgDistrictDirectoryEntry,
} from "@/lib/regional/districts";
import { useLanguage } from "@/providers/LanguageProvider";
import { useReaderPreferences } from "@/providers/ReaderPreferencesProvider";
import { DISTRICT_PICKER_OPEN_EVENT } from "./events";

const RECENT_DISTRICTS_KEY = "jdp-recent-districts";
const POPULAR_DISTRICTS = ["raipur", "durg", "bilaspur", "korba", "bastar", "raigarh"];

function readRecentDistricts(): string[] {
  try {
    const value = JSON.parse(localStorage.getItem(RECENT_DISTRICTS_KEY) ?? "[]");
    return Array.isArray(value)
      ? value.filter((slug): slug is string => typeof slug === "string").slice(0, 4)
      : [];
  } catch {
    return [];
  }
}

function rememberDistrict(slug: string): string[] {
  const next = [slug, ...readRecentDistricts().filter((item) => item !== slug)].slice(0, 4);
  localStorage.setItem(RECENT_DISTRICTS_KEY, JSON.stringify(next));
  return next;
}

function matchesQuery(district: CgDistrictDirectoryEntry, query: string): boolean {
  const needle = query.trim().toLocaleLowerCase();
  if (!needle) return true;
  return [district.name, district.nameHi, district.slug, ...district.aliases]
    .join(" ")
    .toLocaleLowerCase()
    .includes(needle);
}

export function DistrictModal() {
  const { prefs, setHomeDistrict } = useReaderPreferences();
  const { language } = useLanguage();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<number | null>(null);
  const [districtOpen, setDistrictOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [recentSlugs, setRecentSlugs] = useState<string[]>([]);
  const [selectingSlug, setSelectingSlug] = useState<string | null>(null);

  const closeModal = useCallback(() => {
    setQuery("");
    setSelectingSlug(null);
    setDistrictOpen(false);
  }, []);

  useEffect(() => {
    const open = () => {
      setRecentSlugs(readRecentDistricts());
      setDistrictOpen(true);
    };
    window.addEventListener(DISTRICT_PICKER_OPEN_EVENT, open);
    return () => window.removeEventListener(DISTRICT_PICKER_OPEN_EVENT, open);
  }, []);

  useEffect(
    () => () => {
      if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    },
    []
  );

  useModalA11y({
    open: districtOpen,
    onClose: closeModal,
    panelRef,
    // The modal is rendered inside app-shell__content, so inert only its sibling
    // reader surfaces. Inerting the ancestor also disables the sheet itself.
    inertSelector: ".jdp-shell, .top-ten-dock, .continue-ribbon",
    initialFocusSelector: ".district-modal__search input",
  });

  const isEnglish = language === "en";
  const filtered = useMemo(
    () => CHHATTISGARH_DISTRICT_DIRECTORY.filter((district) => matchesQuery(district, query)),
    [query]
  );
  const available = filtered.filter((district) => district.availability === "available");
  const comingSoon = filtered.filter((district) => district.availability === "coming-soon");
  const recent = recentSlugs
    .map((slug) => available.find((district) => district.slug === slug))
    .filter((district): district is CgDistrictDirectoryEntry => Boolean(district));
  const popular = POPULAR_DISTRICTS
    .map((slug) => available.find((district) => district.slug === slug))
    .filter((district): district is CgDistrictDirectoryEntry => Boolean(district));

  if (!districtOpen) return null;

  const selectDistrict = (slug: string) => {
    if (selectingSlug) return;
    setSelectingSlug(slug);
    triggerHaptic("success");
    setHomeDistrict(slug);
    setRecentSlugs(rememberDistrict(slug));
    closeTimerRef.current = window.setTimeout(closeModal, 180);
  };

  const districtButton = (district: CgDistrictDirectoryEntry) => {
    const active = prefs.homeDistrict === district.slug;
    const selecting = selectingSlug === district.slug;
    const unavailable = district.availability === "coming-soon";
    return (
      <button
        type="button"
        key={district.slug}
        className={`district-modal__district${active ? " is-active" : ""}${selecting ? " is-selecting" : ""}${unavailable ? " is-unavailable" : ""}`}
        onClick={() => !unavailable && selectDistrict(district.slug)}
        disabled={unavailable}
        aria-pressed={active}
        data-district-slug={district.slug}
      >
        <MapPin size={16} aria-hidden />
        <span>
          <strong>{isEnglish ? district.name : district.nameHi}</strong>
          <small>{isEnglish ? district.nameHi : district.name}</small>
        </span>
        {active || selecting ? <Check size={17} aria-hidden /> : null}
      </button>
    );
  };

  const section = (id: string, title: string, items: CgDistrictDirectoryEntry[]) =>
    items.length ? (
      <section className="district-modal__section" aria-labelledby={id}>
        <h3 id={id}>{title}</h3>
        <div className="district-modal__grid">{items.map(districtButton)}</div>
      </section>
    ) : null;

  return (
    <div className="district-modal" role="presentation" data-testid="district-modal">
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
        <div className="district-modal__handle" aria-hidden />
        <div className="district-modal__sticky">
          <header className="district-modal__header">
            <span className="district-modal__icon" aria-hidden>
              <MapPin size={18} />
            </span>
            <div>
              <p>{isEnglish ? "Your local edition" : "आपका स्थानीय संस्करण"}</p>
              <h2 id="district-modal-title">
                {isEnglish ? "Choose your district" : "अपना जिला चुनें"}
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
              placeholder={isEnglish ? "Search in English or Hindi" : "हिंदी या English में खोजें"}
              autoComplete="off"
            />
            {query ? (
              <button
                type="button"
                aria-label={isEnglish ? "Clear search" : "खोज साफ करें"}
                onClick={() => setQuery("")}
              >
                <XCircle size={18} aria-hidden />
              </button>
            ) : null}
          </label>
        </div>

        <div className="district-modal__scroll">
          {query ? (
            <>
              {section("district-search-available", isEnglish ? "Available" : "उपलब्ध", available)}
              {section("district-search-soon", isEnglish ? "Coming soon" : "जल्द आ रहा है", comingSoon)}
            </>
          ) : (
            <>
              {section("district-recent", isEnglish ? "Recently used" : "हाल में चुने गए", recent)}
              {section("district-popular", isEnglish ? "Popular" : "लोकप्रिय", popular)}
              {section("district-all", isEnglish ? "All available districts" : "सभी उपलब्ध जिले", available)}
              {section("district-coming-soon", isEnglish ? "Coming soon" : "जल्द आ रहा है", comingSoon)}
            </>
          )}
          {!available.length && !comingSoon.length ? (
            <p className="district-modal__empty">
              {isEnglish ? "No district matches your search." : "आपकी खोज से कोई जिला नहीं मिला।"}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
