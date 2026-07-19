import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { JdIcon } from "./icons";

/** Kicker / category tag — uppercase Mukta 800, red by default. */
export function Tag({
  children,
  color = "var(--jd-red)",
  style,
}: {
  children: ReactNode;
  color?: string;
  style?: CSSProperties;
}) {
  return (
    <span
      className="jd-ui"
      style={{
        fontSize: 9.5,
        fontWeight: 800,
        letterSpacing: ".09em",
        color,
        textTransform: "uppercase",
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
        padding: "16px 14px 9px",
      }}
    >
      <span
        aria-hidden="true"
        style={{ width: 4, height: 16, background: color, borderRadius: 1, flexShrink: 0 }}
      />
      <h2
        className="jd-serif"
        style={{ margin: 0, fontSize: 16, lineHeight: "22px", fontWeight: 700, color: "var(--jd-ink)" }}
      >
        {title}
      </h2>
      <span style={{ flex: 1, height: 1, background: "var(--jd-line)" }} />
      {moreHref ? (
        <Link
          href={moreHref}
          className="jd-ui"
          style={{
            fontSize: 11.5,
            fontWeight: 700,
            color: "var(--jd-red)",
            display: "flex",
            alignItems: "center",
            gap: 2,
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
    <div style={{ borderLeft: "3px solid var(--jd-gold)", paddingLeft: 11, margin: "9px 0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, flexWrap: "wrap" }}>
        <span
          className="jd-ui"
          style={{ fontSize: 9.5, fontWeight: 800, color: "var(--jd-gold)", letterSpacing: ".1em" }}
        >
          <span aria-hidden="true">✦ </span>संक्षेप में
        </span>
        <span className="jd-ui" style={{ fontSize: 9, color: "var(--jd-muted)" }}>
          · AI-सहायता, संपादक-सत्यापित
        </span>
      </div>
      <p className="jd-ui" style={{ margin: 0, fontSize: 12.5, lineHeight: 1.55, color: "var(--jd-ink-2)" }}>
        {children}
      </p>
    </div>
  );
}

export { ActionRow } from "./ActionRow";
