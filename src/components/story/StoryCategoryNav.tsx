"use client";

import Link from "next/link";
import type { StoryCategoryLink } from "@/lib/news/story-view";
import { useLanguage } from "@/providers/LanguageProvider";

type StoryCategoryNavProps = {
  links: StoryCategoryLink[];
};

export function StoryCategoryNav({ links }: StoryCategoryNavProps) {
  const { language } = useLanguage();

  return (
    <nav
      className="story-cat-nav"
      aria-label="Browse categories"
    >
      <ul className="story-cat-nav__list" role="list">
        {links.map((link) => {
          const text =
            language === "en" ? link.label : link.labelHi ?? link.label;
          return (
            <li key={link.id}>
              <Link
                href={link.href}
                className={`story-cat-nav__link ${link.active ? "story-cat-nav__link--active" : ""}`}
                aria-current={link.active ? "page" : undefined}
              >
                <span>{text}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
