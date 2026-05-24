"use client";

import Link from "next/link";
import { LayoutGrid } from "lucide-react";
import {
  MENU_CATEGORIES,
  MENU_DISTRICTS,
  labelForLink,
} from "@/lib/super-menu/config";
import { pickBilingualLabel } from "@/lib/i18n/pick-label";
import { useLanguage } from "@/providers/LanguageProvider";
import { useNavigation } from "@/providers/NavigationProvider";
import { SuperMenuSection } from "./SuperMenuSection";

type SuperMenuCategoriesProps = {
  onNavigate: (href: string) => void;
};

export function SuperMenuCategories({ onNavigate }: SuperMenuCategoriesProps) {
  const { language } = useLanguage();
  const { pathname } = useNavigation();

  const isActive = (href: string) =>
    href === "/"
      ? pathname === "/"
      : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <SuperMenuSection
      id="sm-categories"
      title={pickBilingualLabel(language, "Categories", "श्रेणियाँ")}
      icon={<LayoutGrid size={16} strokeWidth={2} />}
      defaultOpen
    >
      <ul className="sm-cat-grid" role="list">
        {MENU_CATEGORIES.map((item) => (
          <li key={item.id}>
            <Link
              href={item.href}
              className={`sm-cat-item tap-target${isActive(item.href) ? " is-active" : ""}`}
              aria-current={isActive(item.href) ? "page" : undefined}
              onClick={() => onNavigate(item.href)}
            >
              {labelForLink(item, language)}
            </Link>
          </li>
        ))}
      </ul>

      <p className="sm-cat-districts-title">
        {pickBilingualLabel(language, "Districts", "जिले")}
      </p>
      <div className="sm-district-scroll" role="list">
        {MENU_DISTRICTS.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className={`sm-district-chip tap-target${isActive(item.href) ? " is-active" : ""}`}
            role="listitem"
            onClick={() => onNavigate(item.href)}
          >
            {labelForLink(item, language)}
          </Link>
        ))}
      </div>
    </SuperMenuSection>
  );
}
