"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { JdIcon } from "./icons";

/** A4 auto-refresh toggle + "just updated" status row. */
export function LatestRefreshBar() {
  const router = useRouter();
  const [auto, setAuto] = useState(true);

  return (
    <div
      className="jd-ui"
      style={{
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "8px 14px",
        background: "var(--jd-paper-2)",
        borderBottom: "1px solid var(--jd-line)",
      }}
    >
      <button
        type="button"
        onClick={() => router.refresh()}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontSize: 11.5,
          color: "var(--jd-ink-3)",
          background: "none",
          border: "none",
          padding: "6px 0",
          cursor: "pointer",
          minHeight: 44,
        }}
      >
        <JdIcon name="refresh" size={14} stroke={2} color="var(--jd-ok)" />
        अभी अपडेट किया गया
      </button>
      <button
        type="button"
        role="switch"
        aria-checked={auto}
        onClick={() => setAuto((v) => !v)}
        className="jd-ui"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontSize: 11.5,
          fontWeight: 700,
          color: "var(--jd-ink-2)",
          background: "none",
          border: "none",
          cursor: "pointer",
          minHeight: 44,
        }}
      >
        स्वतः-ताज़ा
        <span
          aria-hidden
          style={{
            width: 34,
            height: 20,
            borderRadius: 20,
            background: auto ? "var(--jd-ok)" : "var(--jd-line)",
            position: "relative",
            display: "inline-block",
          }}
        >
          <span
            style={{
              position: "absolute",
              top: 2,
              left: auto ? 16 : 2,
              width: 16,
              height: 16,
              borderRadius: 16,
              background: "#fff",
              transition: "left 120ms ease",
            }}
          />
        </span>
      </button>
    </div>
  );
}
