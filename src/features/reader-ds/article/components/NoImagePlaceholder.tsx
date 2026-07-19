"use client";

import { useState } from "react";
import { JdIcon } from "../../components/icons";

/** B20 — dashed placeholder with optional load action. */
export function NoImagePlaceholder({
  onLoadRequest,
}: {
  onLoadRequest?: () => void;
}) {
  const [requested, setRequested] = useState(false);

  return (
    <div
      style={{
        height: 170,
        borderRadius: 2,
        background: "var(--jd-paper-2)",
        border: "1px dashed var(--jd-line)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        marginBottom: 6,
      }}
    >
      <JdIcon name="eye" size={26} stroke={1.6} color="var(--jd-muted)" />
      <div className="jd-ui" style={{ fontSize: 11.5, color: "var(--jd-ink-3)", fontWeight: 600 }}>
        {requested ? "इमेज लोड हो रही है…" : "इमेज उपलब्ध नहीं / डेटा-बचत चालू"}
      </div>
      <button
        type="button"
        className="jd-ui"
        onClick={() => {
          setRequested(true);
          onLoadRequest?.();
        }}
        style={{
          fontSize: 11.5,
          fontWeight: 800,
          color: "var(--jd-red)",
          border: "1px solid var(--jd-red)",
          borderRadius: 2,
          padding: "6px 14px",
          background: "transparent",
          cursor: "pointer",
          minHeight: 44,
        }}
      >
        इमेज लोड करें
      </button>
    </div>
  );
}
