"use client";

import Link from "next/link";
import { MENU_SETTINGS_LINKS, labelForLink } from "@/lib/super-menu/config";
import { pickBilingualLabel } from "@/lib/i18n/pick-label";
import { useLanguage } from "@/providers/LanguageProvider";
import { SuperMenuBlock } from "./SuperMenuBlock";

type SuperMenuSettingsProps = {
  onNavigate: (href: string) => void;
};

export function SuperMenuSettings({ onNavigate }: SuperMenuSettingsProps) {
  const { language } = useLanguage();

  return (
    <SuperMenuBlock
      id="sm-settings"
      title={pickBilingualLabel(language, "Settings", "सेटिंग्स")}
    >
      <ul className="sm-simple-list" role="list">
        {MENU_SETTINGS_LINKS.map((item) => (
          <li key={item.id}>
            <Link
              href={item.href}
              className="sm-simple-link tap-target"
              onClick={() => onNavigate(item.href)}
            >
              {labelForLink(item, language)}
            </Link>
          </li>
        ))}
      </ul>
    </SuperMenuBlock>
  );
}
