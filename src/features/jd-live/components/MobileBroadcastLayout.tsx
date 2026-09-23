"use client";

import React from "react";
import { AnchorFigure } from "./AnchorFigure";
import { NewsScreen } from "./NewsScreen";
import { BroadcastTicker } from "./BroadcastTicker";
import { LowerThird } from "./LowerThird";
import { BreakingBanner } from "./BreakingBanner";
import { TopTenPanel } from "./TopTenPanel";
import { LiveIndicator } from "./LiveIndicator";
import { useBroadcast } from "../BroadcastContext";

/**
 * Mobile broadcast layout — stacked single-column.
 * NewsScreen → Anchor → LowerThird/Breaking → Top10 → Ticker
 */
export function MobileBroadcastLayout({ embedded = false }: { embedded?: boolean }) {
  const { state } = useBroadcast();
  const { language } = state;

  return (
    <div className={`jdl-mobile ${embedded ? "jdl-mobile--embedded" : ""}`}>
      {/* Top bar */}
      <div className="jdl-mobile__topbar">
        <div className="jdl-mobile__brand">
          <span className="jdl-mobile__brand-dot" aria-hidden />
          <span className="jdl-mobile__brand-name">
            {language === "hi" ? "जन दर्पण" : "JAN DARPAN"}
          </span>
        </div>
        <LiveIndicator />
      </div>

      {/* Main news screen (shown when story has an image) */}
      {state.currentSegment?.imageUrl ? (
        <div className="jdl-mobile__screen">
          <NewsScreen />
        </div>
      ) : null}

      {/* Anchor */}
      <div className="jdl-mobile__anchor">
        <AnchorFigure />
      </div>

      {/* Lower-third or breaking */}
      <div className="jdl-mobile__lower">
        <LowerThird />
        <BreakingBanner />
      </div>

      {/* Top 10 below main area on mobile */}
      <div className="jdl-mobile__top10">
        <TopTenPanel />
      </div>

      {/* Ticker */}
      <div className="jdl-mobile__ticker">
        <BroadcastTicker />
      </div>
    </div>
  );
}
