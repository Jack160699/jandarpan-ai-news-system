import type { ReactNode } from "react";
import "../styles";
import { readerDsFontClassName } from "../fonts";
import { ExperienceChrome } from "../experience/ExperienceChrome";
import type { BriefingTrack } from "../experience/audio/types";
import { OfflineServiceWorkerRegister } from "../offline/OfflineServiceWorkerRegister";
import { NetworkGuards } from "../system/NetworkGuards";
import { PermissionSheet } from "../system/PermissionSheet";
import { SearchOverlay } from "./SearchOverlay";

type ReaderShellProps = {
  children: ReactNode;
  activeNav?: string | null;
  dark?: boolean;
  /** Extra bottom padding (default 0). */
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
  /** Show SoT desktop/tablet footer (default on). */
  showDeskFooter?: boolean;
};

/**
 * Shared page chrome — fonts, tokens, search, audio.
 * Full screen space reclaimed: no traditional navbar dock or persistent menu.
 */
export function ReaderShell({
  children,
  activeNav = "live",
  dark = false,
  bottomPad = 0,
  hideBottomNav = true,
  includeSearchOverlay = true,
  audioTracks,
  reserveMiniPlayer = false,
  showPermissionSheets = true,
  showDeskFooter = true,
}: ReaderShellProps) {
  const pad = bottomPad + (reserveMiniPlayer ? 52 : 0);
  /** null activeNav still shows bottom nav (no current item) — used on account hub. */
  const showNav = !hideBottomNav;

  return (
    <ExperienceChrome tracks={audioTracks}>
      <div
        className={`jd-ds jd-ds--stage ${readerDsFontClassName}`}
        data-testid="jd-reader-ds"
        data-theme={dark ? "dark" : undefined}
        style={{
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          background: "var(--jd-paper)",
        }}
      >
        <OfflineServiceWorkerRegister />
        <NetworkGuards />
        {children}
        {includeSearchOverlay ? <SearchOverlay /> : null}
        {showPermissionSheets ? <PermissionSheet /> : null}
      </div>
    </ExperienceChrome>
  );
}
