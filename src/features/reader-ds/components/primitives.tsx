import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { JdIcon } from "./icons";

function scriptHint(text: string): "deva" | "latn" {
  return /[\u0900-\u097F]/.test(text) ? "deva" : "latn";
}

/** Kicker / category tag — Mukta 800; uppercase only for Latin script. */
export function Tag({
  children,
  color = "var(--jd-red)",
  style,
}: {
  children: ReactNode;
  color?: string;
  style?: CSSProperties;
}) {
  const label = typeof children === "string" ? children : "";
  return (
    <span
      className="jd-ui jd-type-tag"
      data-script={label ? scriptHint(label) : "deva"}
      style={{
        color,
        ...style,
      }}
    >
      {children}
    </span>
  );
}

/** Section header — bold editorial divider + title + rule + optional subtitle + "और पढ़ें →" link. */
export function SectionHeader({
  title,
  subtitle,
  color = "var(--jd-red)",
  moreHref,
  moreLabel = "और पढ़ें",
}: {
  title: string;
  subtitle?: string;
  color?: string;
  moreHref?: string;
  moreLabel?: string;
}) {
  return (
    <div
      style={{
        padding: "22px 14px 12px",
        borderTop: "1px solid var(--jd-line-2)",
        marginTop: 8,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <span
          aria-hidden="true"
          style={{ width: 5, height: 24, background: color, borderRadius: 2, flexShrink: 0 }}
        />
        <h2
          className="jd-serif jd-type-section"
          style={{
            margin: 0,
            color: "var(--jd-ink)",
            fontWeight: 850,
            fontSize: "clamp(1.25rem, 4vw, 1.45rem)",
            letterSpacing: "-0.02em",
            lineHeight: 1.2,
          }}
        >
          {title}
        </h2>
        <span style={{ flex: 1, height: 2, background: "var(--jd-line)", borderRadius: 1 }} />
        {moreHref ? (
          <Link
            href={moreHref}
            className="jd-ui jd-type-button"
            style={{
              fontWeight: 750,
              fontSize: 13,
              color,
              display: "flex",
              alignItems: "center",
              gap: 3,
              paddingBlock: "0.15em",
              textDecoration: "none",
              flexShrink: 0,
            }}
          >
            {moreLabel}
            <JdIcon name="chevR" size={14} stroke={2.4} />
          </Link>
        ) : null}
      </div>
      {subtitle ? (
        <div
          className="jd-ui"
          style={{
            margin: "5px 0 0 15px",
            fontSize: 12.5,
            color: "var(--jd-ink-2)",
            fontWeight: 500,
          }}
        >
          {subtitle}
        </div>
      ) : null}
    </div>
  );
}


/** Mandatory AI transparency summary — gold left rule. */
export function AiSummary({ children }: { children: ReactNode }) {
  return (
    <div style={{ borderLeft: "3px solid var(--jd-gold)", paddingLeft: 11, margin: "10px 0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5, flexWrap: "wrap" }}>
        <span
          className="jd-ui jd-type-meta"
          style={{ fontWeight: 800, color: "var(--jd-gold)", letterSpacing: ".06em" }}
        >
          <span aria-hidden="true">✦ </span>संक्षेप में
        </span>
        <span className="jd-ui jd-type-caption" style={{ color: "var(--jd-ink-3)" }}>
          · AI-सहायता, संपादक-सत्यापित
        </span>
      </div>
      <p className="jd-ui jd-type-summary" style={{ margin: 0, color: "var(--jd-ink-2)" }}>
        {children}
      </p>
    </div>
  );
}

export { ActionRow } from "./ActionRow";
