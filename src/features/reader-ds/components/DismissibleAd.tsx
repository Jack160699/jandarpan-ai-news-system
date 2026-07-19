"use client";

import { useState, type ReactNode } from "react";
import { Ad } from "./Ad";

/** Client wrapper so close actually dismisses the unit (E45). */
export function DismissibleAd({
  label,
  size,
  height,
  sticky = false,
  children,
}: {
  label?: string;
  size?: string;
  height?: number;
  sticky?: boolean;
  children?: ReactNode;
}) {
  const [open, setOpen] = useState(true);
  if (!open) return null;

  if (sticky) {
    return (
      <div
        className="jd-sticky-ad"
        role="complementary"
        aria-label="विज्ञापन"
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: "calc(56px + env(safe-area-inset-bottom))",
          zIndex: 48,
          background: "#efe7d6",
          borderTop: "1px solid var(--jd-line)",
          padding: "6px 10px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 2,
          }}
        >
          <span
            className="jd-ui"
            style={{
              fontSize: 8,
              fontWeight: 800,
              letterSpacing: ".12em",
              color: "var(--jd-muted)",
              textTransform: "uppercase",
            }}
          >
            विज्ञापन
          </span>
          <button
            type="button"
            aria-label="विज्ञापन बंद करें"
            onClick={() => setOpen(false)}
            className="jd-ui"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--jd-ink-3)",
              fontSize: 14,
              minWidth: 32,
              minHeight: 32,
            }}
          >
            ×
          </button>
        </div>
        {children ?? (
          <div
            className="jd-ui"
            style={{
              height: 44,
              borderRadius: 2,
              border: "1px dashed var(--jd-muted)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 10,
              color: "var(--jd-muted)",
            }}
          >
            {label ?? "स्टिकी बैनर · 320×50"}
          </div>
        )}
      </div>
    );
  }

  return (
    <div onClickCapture={(e) => {
      const t = e.target as HTMLElement;
      if (t.closest('[aria-label="बंद करें"]')) {
        e.preventDefault();
        e.stopPropagation();
        setOpen(false);
      }
    }}
    >
      <Ad label={label} size={size} height={height} close>
        {children}
      </Ad>
    </div>
  );
}
