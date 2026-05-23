import type { BottomNavTab, NavCategory } from "@/lib/navigation";

/** Normalize hash links for cross-page navigation */
export function resolveNavHref(href: string, currentPath: string): string {
  if (href.startsWith("#")) {
    return currentPath === "/" ? href : `/${href}`;
  }
  return href;
}

export function isBottomNavActive(
  tab: BottomNavTab,
  pathname: string,
  hash: string
): boolean {
  switch (tab.id) {
    case "home":
      return pathname === "/" && !hash;
    case "videos":
      return pathname === "/shorts" || pathname.startsWith("/shorts/");
    case "live":
      return pathname === "/live" || pathname.startsWith("/live/");
    case "profile":
      return pathname === "/archive" || pathname.startsWith("/archive");
    default:
      return false;
  }
}

export function isBottomNavPending(
  tab: BottomNavTab,
  pendingPath: string | null
): boolean {
  if (!pendingPath) return false;
  if (tab.action) return false;
  return pendingPath === tab.href || pendingPath.startsWith(`${tab.href}/`);
}

export function isCategoryActive(
  cat: NavCategory,
  pathname: string,
  hash: string
): boolean {
  if (cat.href.startsWith("/category/")) {
    return pathname === cat.href || pathname.startsWith(`${cat.href}/`);
  }
  if (cat.href.startsWith("#")) {
    if (pathname !== "/") return false;
    const id = cat.href.slice(1);
    return hash === `#${id}` || (hash === "" && id === "top-news");
  }
  if (cat.href === "/" || cat.href === "#top-news") {
    return pathname === "/" && (!hash || hash === "#top-news");
  }
  return pathname === cat.href || pathname.startsWith(`${cat.href}/`);
}

export function categoryHref(cat: NavCategory): string {
  if (cat.href.startsWith("#")) return cat.href;
  return cat.href;
}
