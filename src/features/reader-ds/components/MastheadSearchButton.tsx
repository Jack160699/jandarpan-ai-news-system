"use client";

import { useReaderPreferences } from "@/providers/ReaderPreferencesProvider";
import { useJdDsT } from "../i18n";
import { JdIcon } from "./icons";

/** Opens A6 search overlay (preferred over navigating away). */
export function MastheadSearchButton() {
  const { setSearchOpen } = useReaderPreferences();
  const { t } = useJdDsT();
  return (
    <button
      type="button"
      aria-label={t("masthead.searchAria")}
      data-testid="jd-masthead-search"
      className="jd-masthead__action"
      onClick={() => setSearchOpen(true)}
      style={{
        display: "flex",
        minWidth: 44,
        minHeight: 44,
        width: 44,
        height: 44,
        alignItems: "center",
        justifyContent: "center",
        background: "none",
        border: "none",
        padding: 0,
        cursor: "pointer",
        color: "var(--jd-gold-soft)",
        flexShrink: 0,
      }}
    >
      <JdIcon name="search" size={21} stroke={1.9} color="var(--jd-gold-soft)" />
    </button>
  );
}
