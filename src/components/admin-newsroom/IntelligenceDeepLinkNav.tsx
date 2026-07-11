import Link from "next/link";
import type { IntelligenceDeepLink } from "@/lib/admin/intelligence-deep-links";

type IntelligenceDeepLinkNavProps = {
  links: IntelligenceDeepLink[];
  className?: string;
  label?: string;
};

export function IntelligenceDeepLinkNav({
  links,
  className = "",
  label = "Related desks",
}: IntelligenceDeepLinkNavProps) {
  if (!links.length) return null;

  return (
    <nav
      className={`anr-intel-deep-links ${className}`.trim()}
      aria-label={label}
    >
      <ul className="anr-intel-deep-links__list">
        {links.map((entry) => (
          <li key={`${entry.href}-${entry.label}`}>
            <Link
              href={entry.href}
              className="anr-intel-deep-links__link"
              aria-label={entry.ariaLabel}
            >
              {entry.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
