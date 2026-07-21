"use client";

import { useJdDsT } from "../i18n";
import { localizeCommodity } from "./commodities";
import { formatMandiReportLabel } from "./freshness";
import { useMandiRates } from "../hooks/useMandiRates";
import type { CSSProperties } from "react";

/**
 * Honest A1 mandi utility — AGMARKNET only. No gold/silver/fuel/index tiles.
 */
export function MandiRatesPanel({ districtSlug }: { districtSlug?: string | null }) {
  const { t, locale } = useJdDsT();
  const state = useMandiRates(districtSlug);

  if (state.status === "loading") {
    return (
      <div
        className="jd-ui jd-mandi-panel"
        data-testid="jd-mandi-panel"
        data-jd-mandi="loading"
        aria-busy="true"
        style={panelStyle}
      >
        <div style={{ fontSize: 11, fontWeight: 800, color: "var(--jd-muted)" }}>
          {t("mandi.loading")}
        </div>
      </div>
    );
  }

  if (state.status !== "available") {
    return (
      <div
        className="jd-ui jd-mandi-panel"
        data-testid="jd-mandi-panel"
        data-jd-mandi="unavailable"
        style={panelStyle}
      >
        <div style={{ fontSize: 12, fontWeight: 800, color: "var(--jd-navy)" }}>
          {t("mandi.unavailableTitle")}
        </div>
        <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--jd-ink-3)" }}>
          {t("mandi.unavailableBody")}
        </p>
      </div>
    );
  }

  const { data } = state;
  const title =
    data.freshness === "recent" ? t("mandi.titleRecent") : t("mandi.titleToday");

  return (
    <section
      className="jd-ui jd-mandi-panel"
      data-testid="jd-mandi-panel"
      data-jd-mandi="available"
      data-jd-mandi-freshness={data.freshness}
      aria-label={title}
      style={panelStyle}
    >
      <header style={{ marginBottom: 8 }}>
        <h2
          style={{
            margin: 0,
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: "0.04em",
            color: "var(--jd-navy)",
          }}
        >
          {title}
        </h2>
        <p style={{ margin: "2px 0 0", fontSize: 10.5, color: "var(--jd-muted)" }}>
          {data.location ? `${data.location} · ` : null}
          {t("mandi.source")}: {data.source.name}
        </p>
      </header>

      <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {data.rates.map((r) => {
          const labels = localizeCommodity(r.providerCommodity);
          const name = locale === "en" ? labels.en : labels.hi;
          return (
            <li
              key={`${r.providerCommodity}-${r.market}-${r.reportedAt}`}
              data-testid="jd-mandi-rate"
              style={{
                borderTop: "1px solid var(--jd-line)",
                padding: "8px 0",
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 800, color: "var(--jd-ink)" }}>{name}</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: "var(--jd-navy)", marginTop: 2 }}>
                ₹{r.modalPrice.toLocaleString(locale === "en" ? "en-IN" : "hi-IN")}{" "}
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--jd-ink-3)" }}>
                  {locale === "en" ? "/ quintal" : "/ क्विंटल"}
                </span>
              </div>
              <div style={{ fontSize: 11, color: "var(--jd-ink-2)", marginTop: 2 }}>
                {r.market}
                {r.district ? ` · ${r.district}` : ""}
              </div>
              <div style={{ fontSize: 10.5, color: "var(--jd-muted)", marginTop: 2 }}>
                {t("mandi.report")}: {formatMandiReportLabel(r.reportedAt, locale)}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

const panelStyle: CSSProperties = {
  margin: "2px 14px 8px",
  padding: "10px 12px",
  border: "1px solid var(--jd-line)",
  borderRadius: 3,
  background: "#fff",
};
