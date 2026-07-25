"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useReaderPreferences } from "@/providers/ReaderPreferencesProvider";
import { getDistrict } from "@/lib/regional/districts";
import { useJdDsT } from "../i18n";
import { JdIcon } from "./icons";
import { useDistrictWeather } from "../hooks/useDistrictWeather";

type UtilityRowProps = {
  district?: string;
  districtHref?: string;
  dateLabel?: string;
  /** Explicit temp override (tests / SSR). When omitted, fetches Open-Meteo via API. */
  temp?: string;
  /** Skip live fetch when parent supplies temp (legacy / tests). */
  disableLiveWeather?: boolean;
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
 * Compact utility row under masthead — three balanced clusters:
 * district (tappable) · date (center) · weather (end).
 * Long district names ellipsize; no horizontal overflow.
 */
export function UtilityRow({
  district: districtProp,
  districtHref = "/district?select=1",
  dateLabel,
  temp: tempProp,
  disableLiveWeather = false,
}: UtilityRowProps) {
  const { t, locale } = useJdDsT();
  const { prefs } = useReaderPreferences();
  const localeTag = locale === "en" ? "en-IN" : "hi-IN";
  const districtSlug = prefs.homeDistrict?.trim() || "raipur";
  const weather = useDistrictWeather(disableLiveWeather || tempProp ? null : districtSlug);

  let districtLabel = districtProp;
  if (!districtLabel) {
    const d = prefs.homeDistrict
      ? getDistrict(prefs.homeDistrict)
      : getDistrict("raipur");
    districtLabel = d
      ? locale === "en"
        ? d.name
        : d.nameHi
      : t("util.chooseDistrict");
  }

  const date = dateLabel ?? formatShortDate(localeTag);

  let weatherNode: ReactNode;
  if (tempProp) {
    weatherNode = (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          fontWeight: 600,
          justifyContent: "flex-end",
          minWidth: 0,
        }}
        aria-label={tempProp}
      >
        <JdIcon name="sun" size={14} stroke={1.8} color="var(--jd-gold-soft)" />
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {tempProp}
        </span>
      </div>
    );
  } else if (disableLiveWeather) {
    weatherNode = <span aria-hidden style={{ display: "inline-block", minHeight: 14 }} />;
  } else if (weather.status === "loading") {
    weatherNode = (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          fontWeight: 600,
          justifyContent: "flex-end",
          opacity: 0.55,
          minWidth: 0,
        }}
        aria-busy="true"
        aria-label={t("util.weatherLoading")}
      >
        <span
          style={{
            width: 14,
            height: 14,
            borderRadius: 2,
            background: "rgba(142,160,196,0.35)",
            flexShrink: 0,
          }}
        />
        <span
          style={{
            width: 28,
            height: 10,
            borderRadius: 2,
            background: "rgba(142,160,196,0.35)",
            flexShrink: 0,
          }}
        />
      </div>
    );
  } else if (weather.status === "ok" && weather.tempC != null) {
    const condition = locale === "en" ? weather.conditionEn : weather.conditionHi;
    const label = `${weather.tempC}°${condition ? ` ${condition}` : ""}`;
    weatherNode = (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          fontWeight: 600,
          justifyContent: "flex-end",
          minWidth: 0,
        }}
        title={
          weather.fetchedAt
            ? `${t("util.weatherSource")}: Open-Meteo · ${weather.fetchedAt}`
            : t("util.weatherSource")
        }
        aria-label={label}
      >
        <JdIcon name={weather.icon} size={14} stroke={1.8} color="var(--jd-gold-soft)" />
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {weather.tempC}°
        </span>
      </div>
    );
  } else {
    weatherNode = (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          color: "#8ea0c4",
          fontWeight: 600,
          minWidth: 0,
        }}
        aria-label={t("util.weatherUnavailable")}
      >
        <span>{t("util.weatherUnavailable")}</span>
      </div>
    );
  }

  return (
    <div
      className="jd-ui jd-utility-row jd-type-meta"
      data-jd-locale={locale}
      data-jd-weather={tempProp ? "override" : weather.status}
      data-testid="jd-utility-row"
      style={{
        flexShrink: 0,
        background: "var(--jd-navy-deep)",
        width: "100%",
        color: "#c7d0e2",
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) auto minmax(0, 1fr)",
        alignItems: "center",
        columnGap: 8,
        padding: "6px 14px",
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      <Link
        href={districtHref}
        data-testid="jd-utility-district"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 5,
          fontWeight: 700,
          color: "var(--jd-gold-soft)",
          textDecoration: "none",
          minWidth: 0,
          minHeight: 32,
          maxWidth: "100%",
          justifySelf: "start",
        }}
      >
        <JdIcon name="pin" size={13} stroke={2} color="var(--jd-gold)" />
        <span
          className="jd-type-meta"
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            minWidth: 0,
          }}
        >
          {districtLabel}
        </span>
        <JdIcon name="chevD" size={12} stroke={2} color="#8ea0c4" />
      </Link>
      <span
        className="jd-type-meta"
        data-testid="jd-utility-date"
        style={{
          color: "#8ea0c4",
          whiteSpace: "nowrap",
          flexShrink: 0,
          textAlign: "center",
          justifySelf: "center",
        }}
      >
        {date}
      </span>
      <div style={{ justifySelf: "end", minWidth: 0, maxWidth: "100%" }}>{weatherNode}</div>
    </div>
  );
}
