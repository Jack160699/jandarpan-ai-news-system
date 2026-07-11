"use client";

import { Search, Sparkles } from "lucide-react";
import { useShell } from "../AppShell/ShellProvider";
import { useReaderPreferences } from "@/providers/ReaderPreferencesProvider";

/**
 * Floating quick actions for search and AI command palette.
 */
export function QuickActions() {
  const { openCommandPalette } = useShell();
  const { setSearchOpen } = useReaderPreferences();

  return (
    <div className="jdp-quick-actions" aria-label="Quick actions">
      <button
        type="button"
        className="jdp-quick-actions__btn"
        aria-label="Open search"
        onClick={() => setSearchOpen(true)}
      >
        <Search size={20} aria-hidden />
      </button>
      <button
        type="button"
        className="jdp-quick-actions__btn"
        aria-label="AI command palette"
        onClick={openCommandPalette}
      >
        <Sparkles size={20} aria-hidden />
      </button>
    </div>
  );
}
