"use client";

import React from "react";
import { useBroadcast } from "../BroadcastContext";

/**
 * Breaking news banner — red urgent overlay that replaces the lower-third.
 */
export function BreakingBanner() {
  const { state } = useBroadcast();
  const { currentSegment, language, mode } = state;

  if (mode !== "breaking" || !currentSegment) return null;

  const headline =
    language === "hi"
      ? (currentSegment.headlineHi || currentSegment.headline)
      : currentSegment.headline;
  const summary =
    language === "hi"
      ? (currentSegment.summaryHi || currentSegment.summary)
      : currentSegment.summary;

  const breakingLabel = language === "hi" ? "ब्रेकिंग न्यूज़" : "BREAKING NEWS";

  return (
    <div className="jdl-breaking" role="alert" aria-live="assertive">
      <div className="jdl-breaking__label">
        <span className="jdl-breaking__dot" aria-hidden />
        {breakingLabel}
      </div>
      <div className="jdl-breaking__content">
        <div className="jdl-breaking__headline">{headline}</div>
        {summary && (
          <div className="jdl-breaking__summary">{summary}</div>
        )}
      </div>
    </div>
  );
}
