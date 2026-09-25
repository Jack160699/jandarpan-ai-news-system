"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useJdDsT } from "../i18n";
import { JdIcon, jdIconStroke } from "./icons";
import { getPrimaryNavItems, type PrimaryNavKey } from "./navItems";
import { useReaderPreferencesOptional } from "@/providers/ReaderPreferencesProvider";
import { getDistrict } from "@/lib/regional/districts";

export type BottomNavKey = PrimaryNavKey;

/**
 * Compact, theme-aware Jan Darpan app navigation dock.
 * Approved EXACTLY 5 tabs: Live | [District Name] | Home | Taza | Profile.
 * Dynamic selected district name (never static "My District" once district chosen).
 * Zero standing rectangular blocks, zero oversized boxes, strictly theme-aware.
 */
export function BottomNav({
  active,
  dark = false,
}: {
  /** When omitted/null, no item is marked current (e.g. account hub). */
  active?: BottomNavKey | null;
  dark?: boolean;
}) {
  // Navigation philosophy: No traditional bottom navbar or navigation dock.
  // The experience is focused around the primary Live screen.
  return null;
}
