"use client";

import dynamic from "next/dynamic";
import { useRef } from "react";
import { SearchPanel } from "@/components/search/SearchPanel";
import { useModalA11y } from "@/design-system/hooks/useModalA11y";
import { useLanguage } from "@/providers/LanguageProvider";
import { useReaderPreferences } from "@/providers/ReaderPreferencesProvider";
import { isSearchV3Enabled } from "../config";
import { SearchOverlayV3 } from "../SearchOverlayV3";

const SearchPanelLazy = dynamic(
  () =>
    import("@/components/search/SearchPanel").then((m) => ({
      default: m.SearchPanel,
    })),
  { ssr: false, loading: () => null }
);

export type SearchOverlayVariant = "reader" | "layout";

export type SearchOverlayProps = {
  /** reader: production MainHeader overlay. layout: JDP-002 AppShell overlay. */
  variant?: SearchOverlayVariant;
};

/**
 * RC1-002 — Canonical search overlay router.
 * Single owner for V3 vs legacy paths and overlay shell variants.
 */
export function SearchOverlay({ variant = "reader" }: SearchOverlayProps) {
  if (isSearchV3Enabled()) {
    return <SearchOverlayV3 />;
  }

  return <SearchOverlayLegacy variant={variant} />;
}

type SearchOverlayLegacyProps = {
  variant: SearchOverlayVariant;
};

function SearchOverlayLegacy({ variant }: SearchOverlayLegacyProps) {
  const { searchOpen, setSearchOpen } = useReaderPreferences();
  const { t } = useLanguage();
  const panelRef = useRef<HTMLDivElement>(null);
  const isReader = variant === "reader";

  const close = () => setSearchOpen(false);

  useModalA11y({
    open: searchOpen,
    onClose: close,
    panelRef,
    ...(isReader ? { inertSelector: ".app-shell__content" } : {}),
  });

  if (!searchOpen) return null;

  const Panel = isReader ? SearchPanel : SearchPanelLazy;

  if (isReader) {
    return (
      <div
        className="search-overlay search-overlay--sheet"
        role="dialog"
        aria-modal="true"
        aria-label={t.search.title}
      >
        <button
          type="button"
          className="search-overlay__backdrop"
          aria-label={t.ribbon.dismiss}
          onClick={close}
        />
        <div ref={panelRef} className="search-overlay__panel">
          <div className="mobile-sheet__handle mb-3 md:hidden" aria-hidden />
          <p className="meta-label text-[var(--ink-faint)]">{t.search.title}</p>
          <Panel compact autoFocus onNavigate={close} />
          <button
            type="button"
            className="meta-label mt-5 min-h-[44px] text-[var(--ink-faint)] tap-target"
            onClick={close}
          >
            {t.ribbon.dismiss}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="jdp-search-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={t.search.title}
    >
      <button
        type="button"
        className="jdp-search-overlay__backdrop"
        aria-label={t.ribbon.dismiss}
        onClick={close}
      />
      <div ref={panelRef} className="jdp-search-overlay__panel">
        <p className="text-sm text-[var(--jds-color-text-tertiary)] mb-3">
          {t.search.title}
        </p>
        <Panel compact autoFocus onNavigate={close} />
        <button
          type="button"
          className="mt-4 text-sm text-[var(--jds-color-text-secondary)]"
          onClick={close}
        >
          Close
        </button>
      </div>
    </div>
  );
}
