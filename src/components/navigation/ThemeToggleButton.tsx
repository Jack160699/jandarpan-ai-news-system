"use client";

import { useReaderPreferences } from "@/providers/ReaderPreferencesProvider";
import { useLanguage } from "@/providers/LanguageProvider";
import { IconMoon, IconSun } from "./NavIcons";

type ThemeToggleButtonProps = {
  className?: string;
  compact?: boolean;
};

export function ThemeToggleButton({
  className = "",
  compact = false,
}: ThemeToggleButtonProps) {
  const { prefs, toggleTheme } = useReaderPreferences();
  const { t } = useLanguage();
  const isLight = prefs.theme === "light";

  return (
    <button
      type="button"
      className={`theme-toggle${compact ? " theme-toggle--compact" : ""}${className ? ` ${className}` : ""}`}
      aria-label={isLight ? t.header.darkMode : t.header.lightMode}
      aria-pressed={!isLight}
      onClick={toggleTheme}
    >
      <span className="theme-toggle__glass" aria-hidden />
      <span
        className={`theme-toggle__icon theme-toggle__icon--sun${isLight ? " is-active" : ""}`}
        aria-hidden
      >
        <IconSun />
      </span>
      <span
        className={`theme-toggle__icon theme-toggle__icon--moon${!isLight ? " is-active" : ""}`}
        aria-hidden
      >
        <IconMoon />
      </span>
    </button>
  );
}
