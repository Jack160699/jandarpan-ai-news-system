"use client";

import React from "react";
import { useBroadcast } from "../BroadcastContext";

/**
 * Lower-third graphic — category + headline overlay.
 */
export function LowerThird() {
  const { state } = useBroadcast();
  const { currentSegment, language, mode } = state;

  if (mode === "breaking" || !currentSegment) return null;

  const headline =
    language === "hi"
      ? (currentSegment.headlineHi || currentSegment.headline)
      : currentSegment.headline;
  const category =
    language === "hi"
      ? (currentSegment.categoryLabelHi || currentSegment.categoryLabel)
      : currentSegment.categoryLabel;
  const district =
    language === "hi"
      ? (currentSegment.districtHi || currentSegment.district)
      : currentSegment.district;

  const broadcastLabel =
    language === "hi"
      ? "मुख्य खबर"
      : "MAIN STORY";

  return (
    <div className="jdl-lower3" aria-live="polite" aria-atomic="true">
      <div className="jdl-lower3__category">{broadcastLabel}</div>
      <div className="jdl-lower3__headline">{headline}</div>
    </div>
  );
}
