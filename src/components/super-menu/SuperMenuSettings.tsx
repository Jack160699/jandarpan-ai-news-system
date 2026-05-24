"use client";

import Link from "next/link";
import { Moon, Settings, Shield } from "lucide-react";
import { HeaderLanguageSwitcher } from "@/components/navigation/HeaderLanguageSwitcher";
import { MENU_LEGAL_LINKS, labelForLink } from "@/lib/super-menu/config";
import { pickBilingualLabel } from "@/lib/i18n/pick-label";
import { useLanguage } from "@/providers/LanguageProvider";
import { useReaderPreferences } from "@/providers/ReaderPreferencesProvider";
import { SuperMenuSection } from "./SuperMenuSection";

type SuperMenuSettingsProps = {
  onNavigate: (href: string) => void;
};

export function SuperMenuSettings({ onNavigate }: SuperMenuSettingsProps) {
  const { language } = useLanguage();
  const { prefs, toggleTheme } = useReaderPreferences();

  return (
    <SuperMenuSection
      id="sm-settings"
      title={pickBilingualLabel(language, "Settings", "सेटिंग्स")}
      icon={<Settings size={16} strokeWidth={2} />}
      defaultOpen={false}
    >
      <div className="sm-settings-row">
        <span className="sm-settings-row__label">
          {pickBilingualLabel(language, "Language", "भाषा")}
        </span>
        <HeaderLanguageSwitcher compact />
      </div>

      <button
        type="button"
        className="sm-settings-row sm-settings-row--btn tap-target"
        onClick={toggleTheme}
      >
        <span className="sm-settings-row__label">
          <Moon size={16} strokeWidth={2} aria-hidden />
          {pickBilingualLabel(
            language,
            prefs.theme === "light" ? "Dark mode" : "Light mode",
            prefs.theme === "light" ? "डार्क मोड" : "लाइट मोड"
          )}
        </span>
      </button>

      <Link
        href="/archive"
        className="sm-settings-row sm-settings-row--link tap-target"
        onClick={() => onNavigate("/archive")}
      >
        {pickBilingualLabel(language, "Notifications & region", "अलर्ट और क्षेत्र")}
      </Link>

      <div className="sm-legal">
        <p className="sm-legal__title">
          <Shield size={14} strokeWidth={2} aria-hidden />
          {pickBilingualLabel(language, "Legal & Safety", "कानूनी और सुरक्षा")}
        </p>
        <p className="sm-legal__notice">
          {pickBilingualLabel(
            language,
            "Jan Darpan actively monitors harmful, abusive, misleading, and unsafe content to maintain a secure and trusted platform experience.",
            "जन दर्पण हानिकारक, अपमानजनक, भ्रामक और असुरक्षित सामग्री की निगरानी करता है ताकि एक सुरक्षित और विश्वसनीय अनुभव बना रहे।"
          )}
        </p>
        <ul className="sm-legal__links" role="list">
          {MENU_LEGAL_LINKS.map((item) => (
            <li key={item.id}>
              <Link
                href={item.path}
                className="sm-legal__link tap-target"
                onClick={() => onNavigate(item.path)}
              >
                {labelForLink(item, language)}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </SuperMenuSection>
  );
}
