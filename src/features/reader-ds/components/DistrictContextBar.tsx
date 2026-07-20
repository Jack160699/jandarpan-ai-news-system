"use client";

import Link from "next/link";
import { useJdDsT } from "../i18n";
import { JdIcon } from "./icons";

type DistrictContextBarProps = {
  nameHi: string;
  /** Optional English/official name for locale-aware chrome. */
  nameEn?: string;
  changeHref?: string;
  newsCountLabel?: string;
};

/** A2 district context strip under masthead. */
export function DistrictContextBar({
  nameHi,
  nameEn,
  changeHref = "/district?select=1",
  newsCountLabel,
}: DistrictContextBarProps) {
  const { t, locale } = useJdDsT();
  const name = locale === "en" ? nameEn || nameHi : nameHi;

  return (
    <div
      className="jd-ui"
      data-jd-locale={locale}
      style={{
        flexShrink: 0,
        background: "var(--jd-navy-deep)",
        color: "#c7d0e2",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "7px 14px",
        fontSize: locale === "en" ? 10.5 : 11.5,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 5, minWidth: 0, maxWidth: "72%" }}>
        <JdIcon name="pin" size={14} stroke={2} color="var(--jd-gold)" />
        <span
          style={{
            fontWeight: 700,
            color: "var(--jd-gold-soft)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {t("district.nameLabel", { name })}
        </span>
        <Link
          href={changeHref}
          className="jd-ui"
          style={{
            fontSize: 10,
            color: "#8ea0c4",
            border: "1px solid #33477a",
            borderRadius: 2,
            padding: "1px 6px",
            textDecoration: "none",
            flexShrink: 0,
            whiteSpace: "nowrap",
          }}
        >
          {t("district.change")}
        </Link>
      </div>
      {newsCountLabel ? (
        <span style={{ color: "#8ea0c4", whiteSpace: "nowrap", flexShrink: 0 }}>{newsCountLabel}</span>
      ) : null}
    </div>
  );
}
