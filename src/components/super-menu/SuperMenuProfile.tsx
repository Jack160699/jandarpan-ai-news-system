"use client";

import Link from "next/link";
import { Bookmark, Globe, Moon } from "lucide-react";
import { pickBilingualLabel } from "@/lib/i18n/pick-label";
import { HeaderLanguageSwitcher } from "@/components/navigation/HeaderLanguageSwitcher";
import { useLanguage } from "@/providers/LanguageProvider";
import { useReaderAccount } from "@/providers/ReaderAccountProvider";
import { useReaderPreferences } from "@/providers/ReaderPreferencesProvider";
import { SuperMenuBlock } from "./SuperMenuBlock";

type SuperMenuProfileProps = {
  onNavigate: (href: string) => void;
};

export function SuperMenuProfile({ onNavigate }: SuperMenuProfileProps) {
  const { language } = useLanguage();
  const { mounted, isLoggedIn, displayName, signInWithGoogle, signOut } =
    useReaderAccount();
  const { prefs, toggleTheme } = useReaderPreferences();

  if (!mounted) {
    return <div className="sm-profile-sk" aria-hidden />;
  }

  return (
    <SuperMenuBlock
      id="sm-profile"
      title={pickBilingualLabel(language, "Profile", "प्रोफ़ाइल")}
    >
      <p className="sm-profile-name">{displayName}</p>

      {isLoggedIn ? (
        <button
          type="button"
          className="sm-row-btn tap-target"
          onClick={() => void signOut()}
        >
          {pickBilingualLabel(language, "Sign out", "साइन आउट")}
        </button>
      ) : (
        <div className="sm-profile-auth">
          <Link
            href="/login"
            className="sm-row-btn sm-row-btn--primary tap-target"
            onClick={() => onNavigate("/login")}
          >
            {pickBilingualLabel(language, "Login / Sign up", "लॉगिन / साइन अप")}
          </Link>
        </div>
      )}

      <ul className="sm-simple-list" role="list">
        <li>
          <Link
            href="/archive"
            className="sm-simple-link tap-target"
            onClick={() => onNavigate("/archive")}
          >
            <Bookmark size={18} strokeWidth={2} aria-hidden />
            {pickBilingualLabel(language, "Saved Stories", "सेव की खबरें")}
          </Link>
        </li>
        <li className="sm-simple-link sm-simple-link--row">
          <span>
            <Globe size={18} strokeWidth={2} aria-hidden />
            {pickBilingualLabel(language, "Language", "भाषा")}
          </span>
          <HeaderLanguageSwitcher compact />
        </li>
        <li>
          <button
            type="button"
            className="sm-simple-link tap-target"
            onClick={toggleTheme}
          >
            <Moon size={18} strokeWidth={2} aria-hidden />
            {pickBilingualLabel(
              language,
              prefs.theme === "light" ? "Dark theme" : "Light theme",
              prefs.theme === "light" ? "डार्क थीम" : "लाइट थीम"
            )}
          </button>
        </li>
      </ul>
    </SuperMenuBlock>
  );
}
