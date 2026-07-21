import Link from "next/link";
import type { ReactNode } from "react";
import { JdIcon, type JdIconName } from "../components/icons";

type StateBodyProps = {
  icon: JdIconName;
  title: string;
  body: string;
  primary?: { label: string; href?: string; onClick?: () => void };
  secondary?: { label: string; href?: string; onClick?: () => void };
  iconBg?: string;
  iconColor?: string;
  round?: boolean;
  children?: ReactNode;
};

/** F47/F48/F53 — centered calm state body (approved groupF stateBody). */
export function StateBody({
  icon,
  title,
  body,
  primary,
  secondary,
  iconBg = "rgba(10,37,80,.07)",
  iconColor = "var(--jd-navy)",
  round = false,
  children,
}: StateBodyProps) {
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "30px 28px",
        textAlign: "center",
      }}
    >
      <div
        aria-hidden
        style={{
          width: 72,
          height: 72,
          borderRadius: round ? 72 : 6,
          background: iconBg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 18,
        }}
      >
        <JdIcon name={icon} size={34} stroke={1.7} color={iconColor} />
      </div>
      <h1 className="jd-serif" style={{ margin: "0 0 8px", fontSize: 21, fontWeight: 700, color: "var(--jd-ink)" }}>
        {title}
      </h1>
      <p
        className="jd-ui"
        style={{
          margin: "0 0 20px",
          fontSize: 13,
          color: "var(--jd-ink-3)",
          lineHeight: 1.6,
          maxWidth: 260,
        }}
      >
        {body}
      </p>
      {primary ? (
        primary.href ? (
          <Link
            href={primary.href}
            className="jd-ui"
            style={{
              background: "var(--jd-red)",
              color: "#fff",
              fontWeight: 800,
              fontSize: 13.5,
              padding: "12px 26px",
              borderRadius: 3,
              marginBottom: secondary ? 10 : 0,
              textDecoration: "none",
              minHeight: 44,
              display: "inline-flex",
              alignItems: "center",
            }}
          >
            {primary.label}
          </Link>
        ) : (
          <button
            type="button"
            className="jd-ui"
            onClick={primary.onClick}
            style={{
              background: "var(--jd-red)",
              color: "#fff",
              fontWeight: 800,
              fontSize: 13.5,
              padding: "12px 26px",
              borderRadius: 3,
              marginBottom: secondary ? 10 : 0,
              border: "none",
              cursor: "pointer",
              minHeight: 44,
            }}
          >
            {primary.label}
          </button>
        )
      ) : null}
      {secondary ? (
        secondary.href ? (
          <Link
            href={secondary.href}
            className="jd-ui"
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "var(--jd-navy)",
              textDecoration: "underline",
              minHeight: 44,
              display: "inline-flex",
              alignItems: "center",
            }}
          >
            {secondary.label}
          </Link>
        ) : (
          <button
            type="button"
            className="jd-ui"
            onClick={secondary.onClick}
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "var(--jd-navy)",
              textDecoration: "underline",
              background: "none",
              border: "none",
              cursor: "pointer",
              minHeight: 44,
            }}
          >
            {secondary.label}
          </button>
        )
      ) : null}
      {children}
    </div>
  );
}
