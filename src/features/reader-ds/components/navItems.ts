import type { JdIconName } from "./icons";
import { jdDsT, type JdDsLocale } from "../i18n/strings";

/**
 * Primary phone destinations after Profile/More moved to the masthead.
 * Fifth slot: Videos (`/shorts`) — functional route, not duplicated in header.
 * Search stays header-only; More/Profile is header-only.
 */
export type PrimaryNavKey = "home" | "district" | "latest" | "listen" | "videos";

export type PrimaryNavItem = {
  key: PrimaryNavKey;
  icon: JdIconName;
  label: string;
  href: string;
};

const NAV_DEFS: Array<{
  key: PrimaryNavKey;
  icon: JdIconName;
  labelKey: Parameters<typeof jdDsT>[1];
  href: string;
}> = [
  { key: "home", icon: "home", labelKey: "nav.home", href: "/" },
  { key: "district", icon: "pin", labelKey: "nav.district", href: "/district" },
  { key: "latest", icon: "bolt", labelKey: "nav.latest", href: "/latest" },
  { key: "listen", icon: "headphone", labelKey: "nav.listen", href: "/listen" },
  { key: "videos", icon: "play", labelKey: "nav.videos", href: "/shorts" },
];

/** Shared destinations for phone bottom nav (+ unused desktop primary nav). */
export function getPrimaryNavItems(locale: JdDsLocale = "hi"): PrimaryNavItem[] {
  return NAV_DEFS.map((d) => ({
    key: d.key,
    icon: d.icon,
    href: d.href,
    label: jdDsT(locale, d.labelKey),
  }));
}

/** @deprecated Prefer getPrimaryNavItems(locale) — kept for static imports during migration */
export const PRIMARY_NAV_ITEMS: PrimaryNavItem[] = getPrimaryNavItems("hi");
