"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useJdDsT } from "../i18n";
import { DESK_CAT_ITEMS, resolveDeskCatActive } from "./deskCatItems";

/**
 * Mobile horizontal category navigation strip (< 768px).
 * Displays all 13 primary editorial desks in a smooth horizontal scroll row.
 * Active section is marked with a bold label and red accent underline indicator.
 * Hidden on desktop / tablet (where DeskChrome catnav is active).
 */
export function MobileCategoryNav() {
  const pathname = usePathname() || "/";
  const active = resolveDeskCatActive(pathname);
  const { locale } = useJdDsT();

  return (
    <nav
      className="jd-mobile-catnav jd-ui"
      aria-label="Editorial Categories"
      data-testid="jd-mobile-catnav"
      style={{
        display: "flex",
        alignItems: "center",
        overflowX: "auto",
        scrollbarWidth: "none",
        WebkitOverflowScrolling: "touch",
        background: "#ffffff",
        borderBottom: "1px solid var(--jd-line)",
        padding: "0 8px",
        gap: 4,
        position: "sticky",
        top: 48,
        zIndex: 35,
      }}
    >
      {DESK_CAT_ITEMS.map((item) => {
        const isCurrent = active === item.key;
        const label = locale === "en" ? item.labelEn : item.labelHi;

        return (
          <Link
            key={item.key}
            href={item.href}
            aria-current={isCurrent ? "page" : undefined}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              whiteSpace: "nowrap",
              padding: "9px 11px",
              fontSize: 13,
              fontWeight: isCurrent ? 800 : 600,
              color: isCurrent ? "var(--jd-red)" : "var(--jd-ink-2)",
              textDecoration: "none",
              borderBottom: isCurrent
                ? "2.5px solid var(--jd-red)"
                : "2.5px solid transparent",
              transition: "color 0.15s ease, border-color 0.15s ease",
              flexShrink: 0,
            }}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
