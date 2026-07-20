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
 * Compact utility row under masthead — navyDeep, three clusters:
 * district+chev · date · weather+temp (approved A1).
 * Weather is live Open-Meteo only — never invents temperatures.
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
          minWidth: 56,
          justifyContent: "flex-end",
        }}
        aria-label={tempProp}
      >
        <JdIcon name="sun" size={14} stroke={1.8} color="var(--jd-gold-soft)" />
        <span>{tempProp}</span>
      </div>
    );
  } else if (disableLiveWeather) {
    weatherNode = <span aria-hidden style={{ minWidth: 56, display: "inline-block" }} />;
  } else if (weather.status === "loading") {
    weatherNode = (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          fontWeight: 600,
          minWidth: 72,
          justifyContent: "flex-end",
          opacity: 0.55,
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
          }}
        />
        <span
          style={{ width: 36, height: 10, borderRadius: 2, background: "rgba(142,160,196,0.35)" }}
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
          minWidth: 72,
          justifyContent: "flex-end",
          maxWidth: "38%",
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
          minWidth: 56,
          color: "#8ea0c4",
          fontWeight: 600,
        }}
        aria-label={t("util.weatherUnavailable")}
      >
        <span>{t("util.weatherUnavailable")}</span>
      </div>
    );
  }

  return (
    <div
      className="jd-ui jd-utility-row"
      data-jd-locale={locale}
      data-jd-weather={tempProp ? "override" : weather.status}
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
        gap: 8,
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
      <span style={{ color: "#8ea0c4", whiteSpace: "nowrap", flexShrink: 0 }}>{date}</span>
      {weatherNode}
    </div>
  );
}
