"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Masthead } from "../../components/Masthead";
import { ReaderShell } from "../../components/ReaderShell";
import type { ReaderPlan } from "@/lib/monetization/types";
import { buildDisplayPlans, yearlySavingsHint } from "../planHelpers";

/** E37 — plan comparison with monthly/yearly toggle. */
export function PlanComparisonPage({ plans }: { plans: ReaderPlan[] }) {
  const hasYear = plans.some((p) => p.billingInterval === "year");
  const [yearly, setYearly] = useState(false);
  const cards = useMemo(() => buildDisplayPlans(plans, yearly && hasYear), [plans, yearly, hasYear]);
  const yearLabel = yearlySavingsHint(plans);

  return (
    <ReaderShell activeNav="more">
      <Masthead back backHref="/membership" pageTitle="प्लान चुनें" />
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
          मासिक
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
          {yearLabel ?? "वार्षिक"}
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
                अनुशंसित
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
                    /{p.interval === "year" ? "वर्ष" : "माह"}
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
                वर्तमान
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
                {p.comingSoon ? "जल्द उपलब्ध" : p.recommended ? "यह प्लान चुनें" : "चुनें"}
              </Link>
            )}
          </div>
        ))}
        {!plans.length ? (
          <p className="jd-ui" style={{ fontSize: 12, color: "var(--jd-muted)", textAlign: "center" }}>
            सशुल्क प्लान डेटाबेस से लोड होंगे — अभी चेकआउट UI पूर्वावलोकन में है।
          </p>
        ) : null}
      </main>
    </ReaderShell>
  );
}
