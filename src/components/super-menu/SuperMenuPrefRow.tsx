"use client";

import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";

type SuperMenuPrefRowProps = {
  icon: ReactNode;
  label: string;
  value?: ReactNode;
  onClick?: () => void;
  as?: "button" | "div";
};

/** Spotify-style settings row — label left, value right */
export function SuperMenuPrefRow({
  icon,
  label,
  value,
  onClick,
  as = onClick ? "button" : "div",
}: SuperMenuPrefRowProps) {
  const Tag = as;
  const showChevron = as === "button" || Boolean(onClick);

  return (
    <Tag
      type={as === "button" ? "button" : undefined}
      className="sm-pref-row tap-target"
      onClick={onClick}
    >
      <span className="sm-pref-row__left">
        <span className="sm-pref-row__icon" aria-hidden>
          {icon}
        </span>
        <span className="sm-pref-row__label">{label}</span>
      </span>
      <span className="sm-pref-row__right">
        {value}
        {showChevron ? (
          <ChevronRight size={14} strokeWidth={2} aria-hidden />
        ) : null}
      </span>
    </Tag>
  );
}
