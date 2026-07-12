"use client";

import { SearchOverlay as CanonicalSearchOverlay } from "@/features/search-v3/core/SearchOverlay";

/** JDP-002 layout shell — thin wrapper over canonical search overlay. */
export function SearchOverlay() {
  return <CanonicalSearchOverlay variant="layout" />;
}
