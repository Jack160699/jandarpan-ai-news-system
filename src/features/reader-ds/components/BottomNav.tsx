"use client";

import Link from "next/link";
import { useJdDsT } from "../i18n";
import { JdIcon } from "./icons";
import { getPrimaryNavItems } from "./navItems";

export type BottomNavKey = "home" | "district" | "latest" | "listen" | "more";

/**
 * 5-destination bottom navigation (phone). Hidden at tablet+ via CSS —
 * replaced by DesktopPrimaryNav so the mobile column is never stretched.
 */
export function BottomNav({
  active = "home",
  dark = false,
}: {
  active?: BottomNavKey;
  dark?: boolean;
}) {
  const { t, locale } = useJdDsT();
  const items = getPrimaryNavItems(locale);

  return (
    <nav
      className="jd-bottom-nav"
      aria-label={t("nav.aria")}
      data-jd-locale={locale}
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
        padding: "8px 0 max(10px, env(safe-area-inset-bottom))",
      }}
    >
      {items.map((it) => {
        const on = it.key === active;
        const color = on ? "var(--jd-red)" : dark ? "#93a4c2" : "var(--jd-muted)";
        return (
          <Link
            key={it.key}
            href={it.href}
            aria-current={on ? "page" : undefined}
            title={it.label}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
              minWidth: 56,
              maxWidth: 76,
              minHeight: 48,
              justifyContent: "center",
              color,
              padding: "0 2px",
            }}
          >
            <JdIcon name={it.icon} size={21} stroke={on ? 2.1 : 1.8} color={color} />
            <span
              className="jd-ui jd-type-nav"
              style={{
                fontWeight: on ? 800 : 600,
                textAlign: "center",
                whiteSpace: "nowrap",
                overflowX: "hidden",
                overflowY: "visible",
                textOverflow: "ellipsis",
                maxWidth: "100%",
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
