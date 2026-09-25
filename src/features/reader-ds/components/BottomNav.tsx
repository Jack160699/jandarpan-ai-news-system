"use client";

import Link from "next/link";
import { useJdDsT } from "../i18n";
import { JdIcon, jdIconStroke } from "./icons";
import { getPrimaryNavItems, type PrimaryNavKey } from "./navItems";

export type BottomNavKey = PrimaryNavKey;

/**
 * Compact, theme-aware Jan Darpan bottom navigation dock.
 * Approved 5 tabs: Live | Home | My District | Latest | Profile.
 * Zero standing rectangular blocks, zero oversized boxes, strictly theme-aware.
 * Hidden on tablet/desktop via CSS media queries.
 */
export function BottomNav({
  active,
  dark = false,
}: {
  /** When omitted/null, no item is marked current (e.g. account hub). */
  active?: BottomNavKey | null;
  dark?: boolean;
}) {
  const { t, locale } = useJdDsT();
  const items = getPrimaryNavItems(locale);

  return (
    <nav
      className={`jd-bottom-nav ${dark ? "jd-bottom-nav--dark" : ""}`}
      aria-label={t("nav.aria")}
      data-testid="jd-bottom-nav"
      data-jd-locale={locale}
      data-jd-nav-count={String(items.length)}
    >
      {items.map((it) => {
        const on = active != null && it.key === active;
        return (
          <Link
            key={it.key}
            href={it.href}
            prefetch={false}
            aria-current={on ? "page" : undefined}
            data-jd-nav-key={it.key}
            title={it.label}
            className={`jd-bottom-nav__item ${on ? "is-active" : ""}`}
          >
            <span className="jd-bottom-nav__icon-wrap">
              <JdIcon
                name={it.icon}
                size={20}
                stroke={jdIconStroke(20, on ? "active" : "regular")}
                color="currentColor"
              />
              {on && <span className="jd-bottom-nav__indicator" aria-hidden="true" />}
            </span>
            <span className="jd-bottom-nav__label jd-ui jd-type-nav">
              {it.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
