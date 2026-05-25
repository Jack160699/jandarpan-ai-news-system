"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
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
      className="sm-block--tight sm-block--last"
    >
      <ul className="sm-settings-links" role="list">
        {MENU_SETTINGS_LINKS.map((item) => (
          <li key={item.id}>
            <Link
              href={item.href}
              className="sm-settings-links__item tap-target"
              onClick={() => onNavigate(item.href)}
            >
              <span>{labelForLink(item, language)}</span>
              <ChevronRight size={14} strokeWidth={2} aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </SuperMenuBlock>
  );
}
