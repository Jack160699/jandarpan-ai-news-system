"use client";

import Link from "next/link";
import { MENU_CATEGORIES, labelForLink } from "@/lib/super-menu/config";
import { pickBilingualLabel } from "@/lib/i18n/pick-label";
import { useLanguage } from "@/providers/LanguageProvider";
import { useNavigation } from "@/providers/NavigationProvider";
import { SuperMenuBlock } from "./SuperMenuBlock";

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
    <SuperMenuBlock
      id="sm-categories"
      title={pickBilingualLabel(language, "Categories", "श्रेणियाँ")}
      className="sm-block--tight"
    >
      <ul className="sm-cat-grid" role="list">
        {MENU_CATEGORIES.map((item) => (
          <li key={item.id}>
            <Link
              href={item.href}
              className={`sm-cat-grid__item tap-target${isActive(item.href) ? " is-active" : ""}`}
              aria-current={isActive(item.href) ? "page" : undefined}
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
