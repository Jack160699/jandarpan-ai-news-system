"use client";

import Link from "next/link";
import { Wrench } from "lucide-react";
import { MENU_UTILITIES, labelForLink } from "@/lib/super-menu/config";
import { pickBilingualLabel } from "@/lib/i18n/pick-label";
import { useLanguage } from "@/providers/LanguageProvider";
import { SuperMenuSection } from "./SuperMenuSection";

type SuperMenuUtilitiesProps = {
  onNavigate: (href: string) => void;
};

export function SuperMenuUtilities({ onNavigate }: SuperMenuUtilitiesProps) {
  const { language } = useLanguage();

  return (
    <SuperMenuSection
      id="sm-tools"
      title={pickBilingualLabel(language, "Tools & Utilities", "टूल्स")}
      icon={<Wrench size={16} strokeWidth={2} />}
      defaultOpen={false}
    >
      <ul className="sm-util-grid" role="list">
        {MENU_UTILITIES.map((item) => (
          <li key={item.id}>
            <Link
              href={item.href}
              className={`sm-util-card tap-target${item.tone === "live" ? " sm-util-card--live" : ""}`}
              onClick={() => onNavigate(item.href)}
            >
              <span className="sm-util-card__icon" aria-hidden>
                {item.icon}
              </span>
              <span className="sm-util-card__label">
                {labelForLink(item, language)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </SuperMenuSection>
  );
}
