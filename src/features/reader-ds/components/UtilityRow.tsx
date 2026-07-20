"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useReaderPreferences } from "@/providers/ReaderPreferencesProvider";
import { getDistrict } from "@/lib/regional/districts";
import { useJdDsT } from "../i18n";
import { JdIcon } from "./icons";

type UtilityRowProps = {
  district?: string;
  districtHref?: string;
  dateLabel?: string;
  temp?: string;
};

function formatShortDate(localeTag: string): string {
  try {
    const d = new Date();
    const weekday = new Intl.DateTimeFormat(localeTag, { weekday: "short" }).format(d);
    const day = d.getDate();
    const month = new Intl.DateTimeFormat(localeTag, { month: "long" }).format(d);
    return `${weekday.replace(/\.$/, "")} · ${day} ${month}`;
  } catch {
    return "";
  }
}

/**
 * Compact utility row under masthead — navyDeep, three clusters:
 * district+chev · date · weather+temp (approved A1).
 */
export function UtilityRow({
  district: districtProp,
  districtHref = "/district?select=1",
  dateLabel,
  temp,
}: UtilityRowProps) {
  const { t, locale } = useJdDsT();
  const { prefs } = useReaderPreferences();
  const localeTag = locale === "en" ? "en-IN" : "hi-IN";
  const [districtLabel, setDistrictLabel] = useState(
    () => districtProp ?? t("util.chooseDistrict")
  );

  useEffect(() => {
    if (districtProp) {
      setDistrictLabel(districtProp);
      return;
    }
    const d = prefs.homeDistrict ? getDistrict(prefs.homeDistrict) : undefined;
    if (d) {
      setDistrictLabel(locale === "en" ? d.name : d.nameHi);
    } else {
      setDistrictLabel(t("util.chooseDistrict"));
    }
  }, [districtProp, prefs.homeDistrict, locale, t]);

  const date = dateLabel ?? formatShortDate(localeTag);

  return (
    <div
      className="jd-ui jd-utility-row"
      data-jd-locale={locale}
      style={{
        flexShrink: 0,
        background: "var(--jd-navy-deep)",
        width: "100%",
        color: "#c7d0e2",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "6px 14px",
        fontSize: locale === "en" ? 10.5 : 11.5,
      }}
    >
      <Link
        href={districtHref}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 5,
          fontWeight: 700,
          color: "var(--jd-gold-soft)",
          textDecoration: "none",
          maxWidth: "42%",
          minWidth: 0,
        }}
      >
        <JdIcon name="pin" size={13} stroke={2} color="var(--jd-gold)" />
        <span
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {districtLabel}
        </span>
        <JdIcon name="chevD" size={12} stroke={2} color="#8ea0c4" />
      </Link>
      <span style={{ color: "#8ea0c4", whiteSpace: "nowrap" }}>{date}</span>
      {temp ? (
        <div style={{ display: "flex", alignItems: "center", gap: 4, fontWeight: 600 }}>
          <JdIcon name="rain" size={14} stroke={1.8} color="var(--jd-gold-soft)" />
          <span>{temp}</span>
        </div>
      ) : (
        <span aria-hidden style={{ width: 48 }} />
      )}
    </div>
  );
}
