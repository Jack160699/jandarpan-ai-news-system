"use client";

import { Footer } from "@/sections/Footer";
import { useLiveNewsroom } from "@/providers/LiveNewsroomProvider";

/** Homepage footer wired to live breaking ticker */
export function HomepageFooter() {
  const { feed } = useLiveNewsroom();
  const breaking = feed.breakingTicker[0]?.headline ?? null;
  const alert = feed.localBreakingAlerts[0];
  const local = alert
    ? alert.district
      ? `${alert.district}: ${alert.headline}`
      : alert.headline
    : null;

  return <Footer breakingHeadline={breaking} localInfo={local} />;
}
