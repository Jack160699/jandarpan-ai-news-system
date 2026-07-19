"use client";

import { useReaderPreferences } from "@/providers/ReaderPreferencesProvider";
import { JdIcon } from "./icons";

/** Opens A6 search overlay (preferred over navigating away). */
export function MastheadSearchButton() {
  const { setSearchOpen } = useReaderPreferences();
  return (
    <button
      type="button"
      aria-label="खोजें"
      onClick={() => setSearchOpen(true)}
      style={{
        display: "flex",
        minWidth: 44,
        minHeight: 44,
        alignItems: "center",
        justifyContent: "center",
        background: "none",
        border: "none",
        padding: 0,
        cursor: "pointer",
        color: "var(--jd-gold-soft)",
      }}
    >
      <JdIcon name="search" size={21} stroke={1.9} color="var(--jd-gold-soft)" />
    </button>
  );
}
