"use client";

import React, { useEffect, useState } from "react";
import { useBroadcast } from "../BroadcastContext";

/**
 * ● LIVE / ● लाइव indicator with pulsing dot and timestamp.
 */
export function LiveIndicator() {
  const { state } = useBroadcast();
  const { language } = state;
  const [time, setTime] = useState("");

  useEffect(() => {
    const update = () => {
      const now = new Date();
      if (language === "hi") {
        // Hindi locale date/time
        setTime(
          now.toLocaleString("hi-IN", {
            weekday: "short",
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })
        );
      } else {
        setTime(
          now.toLocaleString("en-IN", {
            weekday: "short",
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })
        );
      }
    };
    update();
    const t = setInterval(update, 30_000);
    return () => clearInterval(t);
  }, [language]);

  const liveText = language === "hi" ? "लाइव" : "LIVE";

  return (
    <div className="jdl-live-ind" aria-label={liveText}>
      <span className="jdl-live-ind__dot" aria-hidden />
      <span className="jdl-live-ind__text">{liveText}</span>
      {time && <span className="jdl-live-ind__time">{time}</span>}
    </div>
  );
}
