"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Masthead } from "../../components/Masthead";
import { ReaderShell } from "../../components/ReaderShell";
import { useJdDsT } from "../../i18n";
import type { ReaderPlan } from "@/lib/monetization/types";
import { buildDisplayPlans } from "../planHelpers";

/** E37 — plan comparison with monthly/yearly toggle. */
export function PlanComparisonPage({ plans }: { plans: ReaderPlan[] }) {
  const { t } = useJdDsT();
  const hasYear = plans.some((p) => p.billingInterval === "year");
  const [yearly, setYearly] = useState(false);
  const cards = useMemo(() => buildDisplayPlans(plans, yearly && hasYear), [plans, yearly, hasYear]);
  const yearToggleLabel = useMemo(() => {
    const month = plans.find((p) => p.billingInterval === "month" && p.priceInr > 0);
    const year = plans.find((p) => p.billingInterval === "year" && p.priceInr > 0);
    if (!month || !year) return t("membership.yearly");
    const full = month.priceInr * 12;
    if (full <= year.priceInr) return t("membership.yearly");
    const pct = Math.round(((full - year.priceInr) / full) * 100);
    return t("membership.yearlySave", { pct });
  }, [plans, t]);

  return (
    <ReaderShell activeNav="more">
      <Masthead back backHref="/membership" pageTitle={t("membership.choosePlan")} />
      <div
        style={{
          flexShrink: 0,
          display: "flex",
          justifyContent: "center",
          padding: "12px 0",
        }}
      >
        <button
          type="button"
          className="jd-ui"
          onClick={() => setYearly(false)}
          style={{
            fontSize: 12.5,
            fontWeight: 800,
            padding: "8px 18px",
            background: !yearly ? "var(--jd-navy)" : "#fff",
            color: !yearly ? "#fff" : "var(--jd-ink-2)",
            border: !yearly ? "none" : "1px solid var(--jd-line)",
            borderRadius: "3px 0 0 3px",
            cursor: "pointer",
          }}
        >
          {t("membership.monthly")}
        </button>
        <button
          type="button"
          className="jd-ui"
          disabled={!hasYear && plans.length > 0}
          onClick={() => hasYear && setYearly(true)}
          style={{
            fontSize: 12.5,
            fontWeight: 800,
            padding: "8px 18px",
            background: yearly ? "var(--jd-navy)" : "#fff",
            color: yearly ? "#fff" : "var(--jd-ink-2)",
            border: yearly ? "none" : "1px solid var(--jd-line)",
            borderRadius: "0 3px 3px 0",
            cursor: hasYear || plans.length === 0 ? "pointer" : "not-allowed",
            opacity: !hasYear && plans.length > 0 ? 0.5 : 1,
          }}
        >
          {yearToggleLabel}
        </button>
      </div>
      <main id="main-content" role="main" style={{ flex: 1, overflow: "auto", padding: "4px 16px 20px" }}>
        {cards.map((p) => (
          <div
            key={p.id}
            style={{
              border: `1.5px solid ${p.recommended ? "var(--jd-gold)" : "var(--jd-line)"}`,
              background: p.recommended ? "#fbf3e6" : "#fff",
              borderRadius: 4,
              padding: "14px 16px",
              marginBottom: 12,
              position: "relative",
            }}
          >
            {p.recommended ? (
              <div
                className="jd-ui"
                style={{
                  position: "absolute",
                  top: -9,
                  left: 16,
                  fontSize: 9.5,
                  fontWeight: 800,
                  letterSpacing: ".08em",
                  background: "var(--jd-gold)",
                  color: "var(--jd-navy)",
                  padding: "2px 9px",
                  borderRadius: 2,
                }}
              >
                {t("membership.recommended")}
              </div>
            ) : null}
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
              <span className="jd-serif" style={{ fontSize: 18, fontWeight: 700, color: "var(--jd-ink)" }}>
                {p.name}
              </span>
              <span>
                <span className="jd-ui" style={{ fontSize: 22, fontWeight: 800, color: "var(--jd-navy)" }}>
                  {p.priceLabel}
                </span>
                {!p.comingSoon && !p.isFree ? (
                  <span className="jd-ui" style={{ fontSize: 11, color: "var(--jd-muted)" }}>
                    {p.interval === "year" ? t("membership.perYear") : t("membership.perMonth")}
                  </span>
                ) : null}
              </span>
            </div>
            <div className="jd-ui" style={{ fontSize: 12, color: "var(--jd-ink-3)", marginTop: 4 }}>
              {p.blurb}
            </div>
            {p.isFree ? (
              <div
                className="jd-ui"
                style={{
                  marginTop: 10,
                  textAlign: "center",
                  fontWeight: 800,
                  fontSize: 13,
                  padding: "10px 0",
                  borderRadius: 3,
                  color: "var(--jd-navy)",
                  border: "1.5px solid var(--jd-navy)",
                }}
              >
                {t("membership.current")}
              </div>
            ) : (
              <Link
                href={
                  p.comingSoon
                    ? "/membership"
                    : `/membership/checkout?plan=${encodeURIComponent(p.slug)}&interval=${p.interval}`
                }
                className="jd-ui"
                style={{
                  display: "block",
                  marginTop: 10,
                  textAlign: "center",
                  fontWeight: 800,
                  fontSize: 13,
                  padding: "10px 0",
                  borderRadius: 3,
                  textDecoration: "none",
                  background: p.recommended ? "var(--jd-red)" : "transparent",
                  color: p.recommended ? "#fff" : "var(--jd-navy)",
                  border: p.recommended ? "none" : "1.5px solid var(--jd-navy)",
                }}
              >
                {p.comingSoon
                  ? t("membership.comingSoon")
                  : p.recommended
                    ? t("membership.selectPlan")
                    : t("membership.select")}
              </Link>
            )}
          </div>
        ))}
        {!plans.length ? (
          <p className="jd-ui" style={{ fontSize: 12, color: "var(--jd-muted)", textAlign: "center" }}>
            {t("membership.plansPreview")}
          </p>
        ) : null}
      </main>
    </ReaderShell>
  );
}
