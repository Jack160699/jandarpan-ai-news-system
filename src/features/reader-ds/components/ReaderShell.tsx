import type { ReactNode } from "react";
import "../styles";
import { readerDsFontClassName } from "../fonts";
import { BottomNav, type BottomNavKey } from "./BottomNav";
import { SearchOverlay } from "./SearchOverlay";

type ReaderShellProps = {
  children: ReactNode;
  activeNav?: BottomNavKey | null;
  dark?: boolean;
  /** Extra bottom padding when bottom nav is shown (default 72). */
  bottomPad?: number;
  hideBottomNav?: boolean;
  /** Mount shared search overlay (disable when page embeds its own). */
  includeSearchOverlay?: boolean;
};

/**
 * Shared Phase 1/2 page chrome — fonts, tokens, search overlay, bottom nav.
 */
export function ReaderShell({
  children,
  activeNav = "home",
  dark = false,
  bottomPad = 72,
  hideBottomNav = false,
  includeSearchOverlay = true,
}: ReaderShellProps) {
  return (
    <div
      className={`jd-ds ${readerDsFontClassName}`}
      data-theme={dark ? "dark" : undefined}
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        background: dark ? "#05080f" : "var(--jd-paper)",
      }}
    >
      {children}
      {!hideBottomNav && activeNav ? (
        <>
          <div aria-hidden style={{ height: bottomPad, flexShrink: 0 }} />
          <BottomNav active={activeNav} dark={dark} />
        </>
      ) : null}
      {includeSearchOverlay ? <SearchOverlay /> : null}
    </div>
  );
}
