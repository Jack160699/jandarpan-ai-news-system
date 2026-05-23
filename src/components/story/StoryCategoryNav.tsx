import Link from "next/link";
import type { StoryCategoryLink } from "@/lib/news/story-view";

type StoryCategoryNavProps = {
  links: StoryCategoryLink[];
};

export function StoryCategoryNav({ links }: StoryCategoryNavProps) {
  return (
    <nav
      className="story-cat-nav"
      aria-label="Browse categories"
    >
      <ul className="story-cat-nav__list" role="list">
        {links.map((link) => (
          <li key={link.id}>
            <Link
              href={link.href}
              className={`story-cat-nav__link ${link.active ? "story-cat-nav__link--active" : ""}`}
              aria-current={link.active ? "page" : undefined}
            >
              <span>{link.label}</span>
              {link.labelHi ? (
                <span className="story-cat-nav__hi" lang="hi">
                  {link.labelHi}
                </span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
