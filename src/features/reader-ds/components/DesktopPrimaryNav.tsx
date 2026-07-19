import Link from "next/link";
import { JdIcon } from "./icons";
import { PRIMARY_NAV_ITEMS, type PrimaryNavKey } from "./navItems";

/**
 * Tablet/desktop primary nav — editorial top rail replacing bottom tabs.
 * Hidden below 768px via `.jd-desktop-nav` in responsive.css.
 */
export function DesktopPrimaryNav({
  active = "home",
  dark = false,
}: {
  active?: PrimaryNavKey | null;
  dark?: boolean;
}) {
  if (!active) return null;

  return (
    <nav
      className="jd-desktop-nav jd-ui"
      aria-label="मुख्य नेविगेशन"
      style={{
        flexShrink: 0,
        alignItems: "stretch",
        justifyContent: "center",
        gap: 0,
        background: dark ? "#0a1220" : "#fff",
        borderBottom: dark
          ? "1px solid rgba(150,175,215,0.16)"
          : "1px solid var(--jd-line)",
        padding: "0 20px",
      }}
    >
      <div
        style={{
          display: "flex",
          width: "100%",
          maxWidth: "var(--jd-shell-max)",
          margin: "0 auto",
        }}
      >
        {PRIMARY_NAV_ITEMS.map((it) => {
          const on = it.key === active;
          const color = on
            ? "var(--jd-red)"
            : dark
              ? "#93a4c2"
              : "var(--jd-ink-2)";
          return (
            <Link
              key={it.key}
              href={it.href}
              aria-current={on ? "page" : undefined}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                minHeight: 44,
                padding: "10px 8px",
                color,
                borderBottom: on ? "2.5px solid var(--jd-red)" : "2.5px solid transparent",
                fontWeight: on ? 800 : 600,
                fontSize: 13,
                textDecoration: "none",
              }}
            >
              <JdIcon name={it.icon} size={18} stroke={on ? 2.1 : 1.8} color={color} />
              {it.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
