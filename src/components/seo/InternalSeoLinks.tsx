import Link from "next/link";
import type { InternalLink } from "@/lib/seo/internal-links";

type InternalSeoLinksProps = {
  title: string;
  links: InternalLink[];
  className?: string;
};

export function InternalSeoLinks({
  title,
  links,
  className = "internal-seo-links",
}: InternalSeoLinksProps) {
  if (!links.length) return null;

  return (
    <aside className={className} aria-label={title}>
      <h2 className="internal-seo-links__title">{title}</h2>
      <ul className="internal-seo-links__list">
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className="internal-seo-links__link">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  );
}
