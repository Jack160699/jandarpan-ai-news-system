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

/** Section header — colour bar + serif title + rule + optional "सभी" link. */
export function SectionHeader({
  title,
  color = "var(--jd-red)",
  moreHref,
  moreLabel = "सभी",
}: {
  title: string;
  color?: string;
  moreHref?: string;
  moreLabel?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 9,
        padding: "16px 14px 10px",
      }}
    >
      <span
        aria-hidden="true"
        style={{ width: 4, height: 18, background: color, borderRadius: 1, flexShrink: 0 }}
      />
      <h2 className="jd-serif jd-type-section" style={{ margin: 0, color: "var(--jd-ink)" }}>
        {title}
      </h2>
      <span style={{ flex: 1, height: 1, background: "var(--jd-line)" }} />
      {moreHref ? (
        <Link
          href={moreHref}
          className="jd-ui jd-type-button"
          style={{
            fontWeight: 700,
            color: "var(--jd-red)",
            display: "flex",
            alignItems: "center",
            gap: 2,
            paddingBlock: "0.1em",
          }}
        >
          {moreLabel}
          <JdIcon name="chevR" size={13} stroke={2} />
        </Link>
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
