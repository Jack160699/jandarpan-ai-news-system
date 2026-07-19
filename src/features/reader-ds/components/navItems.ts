import type { JdIconName } from "./icons";

export type PrimaryNavKey = "home" | "district" | "latest" | "listen" | "more";

export type PrimaryNavItem = {
  key: PrimaryNavKey;
  icon: JdIconName;
  label: string;
  href: string;
};

/** Shared destinations for phone bottom nav + tablet/desktop primary nav. */
export const PRIMARY_NAV_ITEMS: PrimaryNavItem[] = [
  { key: "home", icon: "home", label: "होम", href: "/" },
  { key: "district", icon: "pin", label: "मेरा जिला", href: "/district" },
  { key: "latest", icon: "bolt", label: "ताज़ा", href: "/latest" },
  { key: "listen", icon: "headphone", label: "सुनें", href: "/listen" },
  { key: "more", icon: "user", label: "अधिक", href: "/archive" },
];
