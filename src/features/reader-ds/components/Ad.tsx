import type { ReactNode } from "react";
import { JdIcon } from "./icons";

type AdProps = {
  label?: string;
  size?: string;
  height?: number;
  close?: boolean;
  children?: ReactNode;
};

/**
 * Advertisement container with the approved "विज्ञापन" label and optional
 * report/close controls. Renders a labelled empty slot (ad-unavailable state)
 * when no ad creative is provided — never fabricates ad content.
 */
export function Ad({ label, size = "320×64", height = 64, close = false, children }: AdProps) {
  return (
    <aside style={{ margin: "12px 14px 0" }} aria-label="विज्ञापन">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <span
          className="jd-ui jd-type-caption"
          style={{ fontWeight: 800, letterSpacing: ".08em", color: "var(--jd-muted)" }}
        >
          विज्ञापन
        </span>
        {close ? (
          <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button type="button" className="jd-ui jd-type-caption" style={reportBtn}>
              रिपोर्ट
            </button>
            <button type="button" aria-label="बंद करें" style={{ ...reportBtn, padding: 0, display: "flex" }}>
              <JdIcon name="close" size={12} stroke={2} color="var(--jd-muted)" />
            </button>
          </span>
        ) : null}
      </div>
      {children ? (
        children
      ) : (
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
