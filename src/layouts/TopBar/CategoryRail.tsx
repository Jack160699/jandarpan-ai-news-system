"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_CATEGORIES, type NavCategory } from "@/lib/navigation";
import { pickBilingualLabel } from "@/lib/i18n/pick-label";
import { useLanguage } from "@/providers/LanguageProvider";
import { useNavigation } from "@/providers/NavigationProvider";

const CORE_LINKS: NavCategory[] = [
  { id: "home", label: "Home", labelHi: "होम", href: "/" },
  { id: "latest", label: "Latest", labelHi: "ताज़ा", href: "/#home-atlas-feed" },
  { id: "india", label: "India", labelHi: "भारत", href: "/news/national" },
  { id: "world", label: "World", labelHi: "दुनिया", href: "/news/international" },
];

const CATEGORY_LINKS = [
  ...CORE_LINKS.slice(0, 2),
  ...NAV_CATEGORIES.filter((category) => !["top-news", "live", "raipur", "bilaspur"].includes(category.id)),
  ...CORE_LINKS.slice(2),
];

export function CategoryRail() {
  const pathname = usePathname();
  const { language } = useLanguage();
  const { startNavigation } = useNavigation();

  return (
    <nav className="jdp-category-rail" aria-label="News categories">
      <div className="jdp-category-rail__track">
        {CATEGORY_LINKS.map((category) => {
          const targetPath = category.href.split("#")[0] || "/";
          const active =
            category.id === "home"
              ? pathname === "/"
              : category.id !== "latest" &&
                (pathname === targetPath || pathname.startsWith(`${targetPath}/`));
          return (
            <Link
              key={category.id}
              href={category.href}
              className={`jdp-category-rail__link${active ? " is-active" : ""}`}
              aria-current={active ? "page" : undefined}
              onClick={() => startNavigation(category.href)}
            >
              {pickBilingualLabel(language, category.label, category.labelHi ?? category.label)}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
