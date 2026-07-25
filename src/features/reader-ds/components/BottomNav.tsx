"use client";

import Link from "next/link";
import { useJdDsT } from "../i18n";
import { JdIcon } from "./icons";
import { getPrimaryNavItems, type PrimaryNavKey } from "./navItems";

export type BottomNavKey = PrimaryNavKey;

/**
 * Phone bottom navigation — primary reading destinations only.
 * Profile/More lives in the masthead; Search is header-only.
 * Hidden at tablet+ via CSS (DeskChrome replaces phone chrome).
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
      className="jd-bottom-nav"
      aria-label={t("nav.aria")}
      data-testid="jd-bottom-nav"
      data-jd-locale={locale}
      data-jd-nav-count={String(items.length)}
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 50,
        background: dark ? "#0a1220" : "#fff",
        borderTop: dark ? "1px solid rgba(150,175,215,0.16)" : "1px solid var(--jd-line)",
        display: "flex",
        justifyContent: "space-around",
        alignItems: "stretch",
        padding: "6px 4px max(8px, env(safe-area-inset-bottom))",
      }}
    >
      {items.map((it) => {
        const on = active != null && it.key === active;
        const color = on
          ? "var(--jd-red)"
          : dark
            ? "#c7d0e2"
            : "var(--jd-ink-2)";
        return (
          <Link
            key={it.key}
            href={it.href}
            aria-current={on ? "page" : undefined}
            data-jd-nav-key={it.key}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 3,
              flex: "1 1 0",
              minWidth: 0,
              maxWidth: 88,
              minHeight: 48,
              justifyContent: "center",
              color,
              padding: "2px 4px",
              textDecoration: "none",
            }}
          >
            <JdIcon name={it.icon} size={22} stroke={on ? 2.2 : 1.85} color={color} />
            <span
              className="jd-ui"
              style={{
                fontSize: locale === "en" ? 10 : 11,
                fontWeight: on ? 800 : 650,
                lineHeight: 1.15,
                textAlign: "center",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                maxWidth: "100%",
                color,
              }}
            >
              {it.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
