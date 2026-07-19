import Link from "next/link";
import { JdIcon, type JdIconName } from "./icons";

export type BottomNavKey = "home" | "district" | "latest" | "listen" | "more";

const ITEMS: Array<{ key: BottomNavKey; icon: JdIconName; label: string; href: string }> = [
  { key: "home", icon: "home", label: "होम", href: "/" },
  { key: "district", icon: "pin", label: "मेरा जिला", href: "/district" },
  { key: "latest", icon: "bolt", label: "ताज़ा", href: "/latest" },
  { key: "listen", icon: "headphone", label: "सुनें", href: "/listen" },
  { key: "more", icon: "user", label: "अधिक", href: "/archive" },
];

/**
 * 5-destination bottom navigation. Never covers content — the page reserves
 * bottom padding equal to its height. Active destination is red.
 */
export function BottomNav({ active = "home" }: { active?: BottomNavKey }) {
  return (
    <nav
      aria-label="मुख्य नेविगेशन"
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 50,
        background: "#fff",
        borderTop: "1px solid var(--jd-line)",
        display: "flex",
        justifyContent: "space-around",
        padding: "7px 0 max(9px, env(safe-area-inset-bottom))",
      }}
    >
      {ITEMS.map((it) => {
        const on = it.key === active;
        const color = on ? "var(--jd-red)" : "var(--jd-muted)";
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
