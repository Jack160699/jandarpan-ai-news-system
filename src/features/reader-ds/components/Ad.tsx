import type { ReactNode } from "react";
import { resolveAdRenderMode } from "../ads/ad-display";
import { JdIcon } from "./icons";

type AdProps = {
  label?: string;
  size?: string;
  height?: number;
  close?: boolean;
  children?: ReactNode;
  reserveWhenEmpty?: boolean;
  forcePreview?: boolean;
};

/**
 * Advertisement container with approved "विज्ञापन" labelling.
 * Empty slots: preview shows dimensions; production hides or uses subtle reserve.
 * Never fabricates ad content.
 */
export function Ad({
  label,
  size = "320×64",
  height = 64,
  close = false,
  children,
  reserveWhenEmpty = false,
  forcePreview,
}: AdProps) {
  const hasCreative = Boolean(children);
  const mode = resolveAdRenderMode({
    hasCreative,
    reserveWhenEmpty,
    forcePreview,
  });

  if (mode === "hidden") return null;

  return (
    <aside
      style={{ margin: "12px 14px 0" }}
      aria-label="विज्ञापन"
      data-jd-ad-mode={mode}
      data-testid="jd-ad-slot"
    >
      {mode !== "subtle" ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 3,
          }}
        >
          <span
            className="jd-ui jd-type-caption"
            style={{
              fontWeight: 800,
              letterSpacing: ".08em",
              color: "var(--jd-muted)",
            }}
          >
            विज्ञापन
          </span>
          {close ? (
            <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button type="button" className="jd-ui jd-type-caption" style={reportBtn}>
                रिपोर्ट
              </button>
              <button
                type="button"
                aria-label="बंद करें"
                style={{ ...reportBtn, padding: 0, display: "flex" }}
              >
                <JdIcon name="close" size={12} stroke={2} color="var(--jd-muted)" />
              </button>
            </span>
          ) : null}
        </div>
      ) : null}
      {mode === "creative" ? (
        children
      ) : mode === "preview" ? (
        <div
          className="jd-ui jd-type-meta"
          style={{
            minHeight: Math.max(height, 48),
            height: "auto",
            padding: "10px 8px",
            borderRadius: 2,
            border: "1px dashed var(--jd-line)",
            background: "var(--jd-paper-2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--jd-muted)",
            textAlign: "center",
          }}
        >
          {label ?? `विज्ञापन · ${size}`}
        </div>
      ) : (
        <div
          aria-hidden
          style={{
            height: Math.min(height, 48),
            borderRadius: 2,
            background: "var(--jd-paper-2)",
          }}
        />
      )}
    </aside>
  );
}

const reportBtn = {
  color: "var(--jd-muted)",
  background: "none",
  border: "none",
  cursor: "pointer",
  lineHeight: 1.4,
  paddingBlock: "0.1em",
} as const;
