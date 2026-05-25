"use client";

import Link from "next/link";
import { Bookmark, ChevronRight, Moon } from "lucide-react";
import { pickBilingualLabel } from "@/lib/i18n/pick-label";
import { useLanguage } from "@/providers/LanguageProvider";
import { useReaderAccount } from "@/providers/ReaderAccountProvider";
import { useReaderPreferences } from "@/providers/ReaderPreferencesProvider";
import { SuperMenuMenuLanguage } from "./SuperMenuMenuLanguage";
import { SuperMenuPrefRow } from "./SuperMenuPrefRow";

type SuperMenuProfileProps = {
  onNavigate: (href: string) => void;
};

export function SuperMenuProfile({ onNavigate }: SuperMenuProfileProps) {
  const { language } = useLanguage();
  const {
    mounted,
    isLoggedIn,
    displayName,
    avatarInitial,
    isPremium,
    signInWithGoogle,
    signOut,
  } = useReaderAccount();
  const { prefs, toggleTheme } = useReaderPreferences();

  if (!mounted) {
    return <div className="sm-profile-v2 sm-profile-v2--sk" aria-hidden />;
  }

  const themeLabel =
    prefs.theme === "light"
      ? pickBilingualLabel(language, "Light", "लाइट")
      : pickBilingualLabel(language, "Dark", "डार्क");

  return (
    <section className="sm-profile-v2" aria-label={pickBilingualLabel(language, "Profile", "प्रोफ़ाइल")}>
      <div className="sm-profile-v2__top">
        <div className="sm-profile-v2__identity">
          <span className="sm-profile-v2__avatar" aria-hidden>
            {avatarInitial}
          </span>
          <div className="sm-profile-v2__meta">
            <span className="sm-profile-v2__name">{displayName}</span>
            <span className="sm-profile-v2__badge">
              {isPremium
                ? pickBilingualLabel(language, "Premium", "प्रीमियम")
                : pickBilingualLabel(language, "Guest", "अतिथि")}
            </span>
          </div>
        </div>
        {isLoggedIn ? (
          <button
            type="button"
            className="sm-profile-v2__login sm-profile-v2__login--ghost tap-target"
            onClick={() => void signOut()}
          >
            {pickBilingualLabel(language, "Sign out", "बाहर")}
          </button>
        ) : (
          <Link
            href="/login"
            className="sm-profile-v2__login tap-target"
            onClick={() => onNavigate("/login")}
          >
            {pickBilingualLabel(language, "Login", "लॉगिन")}
          </Link>
        )}
      </div>

      <div className="sm-pref-sheet">
        <Link
          href="/archive"
          className="sm-pref-row sm-pref-row--link tap-target"
          onClick={() => onNavigate("/archive")}
        >
          <span className="sm-pref-row__left">
            <span className="sm-pref-row__icon" aria-hidden>
              <Bookmark size={15} strokeWidth={2} />
            </span>
            <span className="sm-pref-row__label">
              {pickBilingualLabel(language, "Saved Stories", "सेव की खबरें")}
            </span>
          </span>
          <ChevronRight size={14} strokeWidth={2} aria-hidden />
        </Link>

        <SuperMenuMenuLanguage />

        <SuperMenuPrefRow
          icon={<Moon size={15} strokeWidth={2} />}
          label={pickBilingualLabel(language, "Theme", "थीम")}
          value={<span className="sm-pref-row__value">{themeLabel}</span>}
          onClick={toggleTheme}
          as="button"
        />
      </div>
    </section>
  );
}
