"use client";

import React, { useEffect, useRef, useState } from "react";
import { useBroadcast } from "../BroadcastContext";

type TickerItem = { id: string; text: string };

/**
 * Slow continuous news ticker — latest headlines scroll left.
 */
export function BroadcastTicker({ showLiveLabel = false }: { showLiveLabel?: boolean }) {
  const { state } = useBroadcast();
  const { queue, language, isPlaying } = state;
  const [items, setItems] = useState<TickerItem[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (queue.length === 0) return;
    const mapped: TickerItem[] = queue.map((seg) => ({
      id: seg.id,
      text: language === "hi" ? (seg.headlineHi || seg.headline) : seg.headline,
    }));
    setItems(mapped);
  }, [queue, language]);

  const liveLabel = language === "hi" ? "● लाइव" : "● LIVE";

  if (items.length === 0) return null;

  // Target 110-130 seconds per complete cycle for calm, comfortable reading
  const durationSec = Math.max(110, Math.min(150, items.length * 5.2));
  const doubled = [...items, ...items];

  return (
    <div
      className={`jdl-ticker ${!isPlaying ? "jdl-ticker--paused" : ""}`}
      aria-label={language === "hi" ? "ताज़ा समाचार" : "Latest News"}
    >
      {showLiveLabel && <div className="jdl-ticker__live-label">{liveLabel}</div>}
      <div className="jdl-ticker__track-wrap" ref={containerRef}>
        <div
          className="jdl-ticker__track"
          style={{ animationDuration: `${durationSec}s` }}
        >
          {doubled.map((item, i) => (
            <span key={`${item.id}-${i}`} className="jdl-ticker__item">
              <span className="jdl-ticker__sep" aria-hidden>◆</span>
              {item.text}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
