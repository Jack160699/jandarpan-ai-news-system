"use client";

import type { GeneratedHomepageFeed } from "@/lib/homepage/types";
import { useReaderAccount } from "@/providers/ReaderAccountProvider";
import { Masthead, ReaderShell } from "../components";
import { AliveHomeBriefingSlot } from "../engagement/AliveHomeModules";

type ReaderLivePageProps = {
  feed: GeneratedHomepageFeed;
};

/**
 * Dedicated Jan Darpan Live TV Broadcast Channel Experience.
 * - Primary landing page for https://www.jandarpan.news (root /)
 * - Pinned 16:9 TV + Seated Anchor + Channel Bug Logo + Live IST Time + Unified Bottom Bar
 * - Mobile: Slim header -> Pinned 16:9 TV -> Current/Recent News Discovery (ताज़ा खबरें)
 * - Desktop: 72% Broadcast TV + 28% Live Editorial Column
 * - NO website footer, NO reserved footer space, NO website-level breaking strip.
 */
export function ReaderLivePage({ feed }: ReaderLivePageProps) {
  const { isPremium } = useReaderAccount();

  return (
    <ReaderShell
      activeNav="live"
      showDeskFooter={false}
      bottomPad={0}
      reserveMiniPlayer={false}
      showPermissionSheets={false}
    >
      <Masthead premiumBadge={isPremium} />

      {/* Main Broadcast Newsroom Experience (No redundant website-level breaking strip or ticker) */}
      <main
        id="main-content"
        role="main"
        className="jd-live-channel-main"
        style={{
          flex: 1,
          background: "var(--jd-paper)",
          display: "flex",
          flexDirection: "column",
          paddingBottom: 0,
        }}
      >
        <AliveHomeBriefingSlot feed={feed} excludeSlugs={new Set()} />
      </main>
    </ReaderShell>
  );
}
