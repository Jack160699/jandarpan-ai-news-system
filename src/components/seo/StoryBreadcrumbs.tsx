import Link from "next/link";
import type { BreadcrumbItem } from "@/lib/seo/breadcrumbs";

type StoryBreadcrumbsProps = {
  items: BreadcrumbItem[];
};

export function StoryBreadcrumbs({ items }: StoryBreadcrumbsProps) {
  if (items.length < 2) return null;

  return (
    <nav className="story-breadcrumbs" aria-label="Breadcrumb">
      <ol className="story-breadcrumbs__list">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={`${item.href}-${index}`} className="story-breadcrumbs__item">
              {isLast ? (
                <span className="story-breadcrumbs__current" aria-current="page">
                  {item.name}
                </span>
              ) : (
                <>
                  <Link href={item.href} className="story-breadcrumbs__link">
                    {item.name}
                  </Link>
                  <span className="story-breadcrumbs__sep" aria-hidden>
                    /
                  </span>
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
