"use client";

import Link from "next/link";
import { useJdDsT } from "../i18n";
import { JdIcon, jdIconStroke } from "./icons";
import { getPrimaryNavItems, type PrimaryNavKey } from "./navItems";

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
} = {}) {
  // App-wide architecture: Bottom navigation is the universal app navigation dock.
  // No second navigation row below the canonical header.
  return null;
}
