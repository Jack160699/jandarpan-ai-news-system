import Link from "next/link";
import { JdIcon } from "./icons";
import { PRIMARY_NAV_ITEMS } from "./navItems";

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
  return (
    <nav
      className="jd-bottom-nav"
      aria-label="मुख्य नेविगेशन"
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
        padding: "7px 0 max(9px, env(safe-area-inset-bottom))",
      }}
    >
      {PRIMARY_NAV_ITEMS.map((it) => {
        const on = it.key === active;
        const color = on ? "var(--jd-red)" : dark ? "#93a4c2" : "var(--jd-muted)";
        return (
          <Link
            key={it.key}
            href={it.href}
            aria-current={on ? "page" : undefined}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 3,
              minWidth: 56,
              minHeight: 44,
              justifyContent: "center",
              color,
            }}
          >
            <JdIcon name={it.icon} size={21} stroke={on ? 2.1 : 1.8} color={color} />
            <span className="jd-ui" style={{ fontSize: 9.5, fontWeight: on ? 800 : 600 }}>
              {it.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
