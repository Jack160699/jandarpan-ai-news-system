"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { JdIcon, type JdIconName } from "../../components/icons";
import { Toggle } from "./Toggle";

type SettingRowProps = {
  icon?: JdIconName;
  label: string;
  sub?: string;
  href?: string;
  toggle?: boolean;
  onToggle?: (next: boolean) => void;
  right?: ReactNode;
};

export function SettingRow({
  icon,
  label,
  sub,
  href,
  toggle,
  onToggle,
  right,
}: SettingRowProps) {
  const body = (
    <>
      {icon ? <JdIcon name={icon} size={20} stroke={1.8} color="var(--jd-navy)" /> : null}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="jd-ui" style={{ fontSize: 14, fontWeight: 600, color: "var(--jd-ink)" }}>
          {label}
        </div>
        {sub ? (
          <div className="jd-ui" style={{ fontSize: 11, color: "var(--jd-muted)", marginTop: 1 }}>
            {sub}
          </div>
        ) : null}
      </div>
      {right != null
        ? right
        : toggle != null
          ? <Toggle on={toggle} onChange={onToggle} label={label} />
          : <JdIcon name="chevR" size={18} stroke={1.8} color="var(--jd-muted)" />}
    </>
  );

  const style = {
    display: "flex" as const,
    alignItems: "center" as const,
    gap: 13,
    padding: "13px 16px",
    borderBottom: "1px solid var(--jd-line-2)",
    minHeight: 44,
    color: "inherit",
    textDecoration: "none" as const,
    background: "transparent",
    width: "100%" as const,
    borderLeft: "none",
    borderRight: "none",
    borderTop: "none",
    cursor: href || onToggle ? ("pointer" as const) : ("default" as const),
    textAlign: "left" as const,
  };

  if (href) {
    return (
      <Link href={href} style={style}>
        {body}
      </Link>
    );
  }

  return (
    <div style={style} role={onToggle ? "button" : undefined}>
      {body}
    </div>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div
      className="jd-ui"
      style={{
        fontSize: 11,
        fontWeight: 800,
        letterSpacing: ".08em",
        color: "var(--jd-muted)",
        padding: "14px 16px 4px",
        textTransform: "uppercase",
      }}
    >
      {children}
    </div>
  );
}
