"use client";

import React from "react";
import { JanDarpanStudio } from "./JanDarpanStudio";

/**
 * Mobile broadcast layout — now uses the unified 16:9 TV landscape format.
 * Renders the clean television broadcast without portrait stacking or bottom Top 10 panel.
 */
export function MobileBroadcastLayout({ embedded = false }: { embedded?: boolean }) {
  return <JanDarpanStudio embedded={embedded} />;
}
