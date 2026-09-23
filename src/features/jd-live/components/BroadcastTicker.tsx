"use client";

import React, { useEffect, useRef, useState } from "react";
import { useBroadcast } from "../BroadcastContext";

type TickerItem = { id: string; text: string };

/**
 * Slow continuous news ticker — latest headlines scroll left.
 */
export function BroadcastTicker() {
  const { state } = useBroadcast();
  const { queue, language } = state;
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

  // Duplicate for seamless looping
  const doubled = [...items, ...items];

  return (
    <div className="jdl-ticker" aria-label={language === "hi" ? "ताज़ा समाचार" : "Latest News"}>
      <div className="jdl-ticker__live-label">{liveLabel}</div>
      <div className="jdl-ticker__track-wrap" ref={containerRef}>
        <div className="jdl-ticker__track">
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
