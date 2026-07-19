import type { ReactNode } from "react";
import "../styles";
import { readerDsFontClassName } from "../fonts";
import { ExperienceChrome } from "../experience/ExperienceChrome";
import type { BriefingTrack } from "../experience/audio/types";
import { NetworkGuards } from "../system/NetworkGuards";
import { PermissionSheet } from "../system/PermissionSheet";
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
  /** Seed audio briefing tracks (listen hub). */
  audioTracks?: BriefingTrack[];
  /** Extra spacer when mini player may show. */
  reserveMiniPlayer?: boolean;
  /** Permission pre-prompts (off for system states). */
  showPermissionSheets?: boolean;
};

/**
 * Shared page chrome — fonts, tokens, search, audio, phone bottom nav +
 * tablet/desktop primary nav (Phase 6).
 */
export function ReaderShell({
  children,
  activeNav = "home",
  dark = false,
  bottomPad = 72,
  hideBottomNav = false,
  includeSearchOverlay = true,
  audioTracks,
  reserveMiniPlayer = true,
  showPermissionSheets = true,
}: ReaderShellProps) {
  const pad = bottomPad + (reserveMiniPlayer ? 52 : 0);
  const showNav = !hideBottomNav && activeNav;

  return (
    <ExperienceChrome tracks={audioTracks}>
      <div
        className={`jd-ds jd-ds--stage ${readerDsFontClassName}`}
        data-theme={dark ? "dark" : undefined}
        style={{
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          background: dark ? "#05080f" : "var(--jd-paper)",
        }}
      >
        <NetworkGuards />
        {children}
        {showNav ? (
          <>
            <div className="jd-nav-spacer" aria-hidden style={{ height: pad, flexShrink: 0 }} />
            <BottomNav active={activeNav} dark={dark} />
          </>
        ) : null}
        {includeSearchOverlay ? <SearchOverlay /> : null}
        {showPermissionSheets ? <PermissionSheet /> : null}
      </div>
    </ExperienceChrome>
  );
}
