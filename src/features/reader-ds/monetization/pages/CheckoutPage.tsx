"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Masthead } from "../../components/Masthead";
import { ReaderShell } from "../../components/ReaderShell";
import { JdIcon } from "../../components/icons";
import type { ReaderPlan } from "@/lib/monetization/types";

const METHODS = [
  { id: "upi", label: "UPI · GPay / PhonePe / Paytm" },
  { id: "card", label: "क्रेडिट / डेबिट कार्ड" },
  { id: "netbanking", label: "नेट बैंकिंग" },
] as const;

/** E39 — checkout shell. No live payment processor — preserves “opening soon”. */
export function CheckoutPage({
  plans,
  planSlug,
  interval = "month",
}: {
  plans: ReaderPlan[];
  planSlug?: string;
  interval?: string;
}) {
  const plan = useMemo(() => {
    const match = plans.find((p) => p.slug === planSlug);
    if (match) return match;
    return plans.find((p) => p.billingInterval === (interval === "year" ? "year" : "month")) ?? plans[0];
  }, [plans, planSlug, interval]);

  const [method, setMethod] = useState<(typeof METHODS)[number]["id"]>("upi");

  const price = plan?.priceInr ?? 0;
  const gst = Math.round(price * 0.18);
  const total = price + gst;
  const name = plan?.nameHi?.trim() || plan?.nameEn || "प्रीमियम";
  const intervalLabel = plan?.billingInterval === "year" ? "वार्षिक" : "मासिक";

  return (
    <ReaderShell activeNav="more" hideBottomNav reserveMiniPlayer={false}>
      <Masthead back backHref="/membership/plans" pageTitle="भुगतान" />
      <main id="main-content" role="main" style={{ flex: 1, overflow: "auto", padding: "14px 16px" }}>
        <div
          style={{
            border: "1px solid var(--jd-line)",
            borderRadius: 4,
            padding: "14px 16px",
            marginBottom: 16,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span className="jd-serif" style={{ fontSize: 16, fontWeight: 700 }}>
              {name} · {intervalLabel}
            </span>
            <span className="jd-ui" style={{ fontSize: 15, fontWeight: 800, color: "var(--jd-navy)" }}>
              {price ? `₹${price}` : "—"}
            </span>
          </div>
          <div
            className="jd-ui"
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 12,
              color: "var(--jd-ink-3)",
              marginBottom: 4,
            }}
          >
            <span>GST (18%)</span>
            <span>{price ? `₹${gst}` : "—"}</span>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              borderTop: "1px solid var(--jd-line-2)",
              paddingTop: 8,
              marginTop: 8,
            }}
          >
            <span className="jd-ui" style={{ fontSize: 14, fontWeight: 800 }}>
              कुल
            </span>
            <span className="jd-ui" style={{ fontSize: 16, fontWeight: 800, color: "var(--jd-red)" }}>
              {price ? `₹${total}` : "—"}
            </span>
          </div>
        </div>

        <div
          className="jd-ui"
          style={{
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: ".08em",
            color: "var(--jd-muted)",
            marginBottom: 10,
            textTransform: "uppercase",
          }}
        >
          भुगतान विधि
        </div>
        {METHODS.map((m) => {
          const on = method === m.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => setMethod(m.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                border: `1.5px solid ${on ? "var(--jd-red)" : "var(--jd-line)"}`,
                borderRadius: 3,
                padding: "13px 14px",
                marginBottom: 10,
                width: "100%",
                background: "#fff",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <span
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 18,
                  border: `2px solid ${on ? "var(--jd-red)" : "var(--jd-muted)"}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {on ? (
                  <span style={{ width: 9, height: 9, borderRadius: 9, background: "var(--jd-red)" }} />
                ) : null}
              </span>
              <span className="jd-ui" style={{ flex: 1, fontSize: 13.5, fontWeight: 600, color: "var(--jd-ink)" }}>
                {m.label}
              </span>
            </button>
          );
        })}

        <div
          className="jd-ui"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            fontSize: 11,
            color: "var(--jd-muted)",
            margin: "6px 0 12px",
          }}
        >
          <JdIcon name="lock" size={14} stroke={1.9} color="var(--jd-green)" />
          256-बिट सुरक्षित भुगतान · लाइव चेकआउट जल्द
        </div>

        {price > 0 ? (
          <Link
            href={`/membership/failure?reason=checkout-not-live&plan=${encodeURIComponent(plan?.slug ?? "")}&method=${method}`}
            className="jd-ui"
            style={{
              display: "block",
              textAlign: "center",
              background: "var(--jd-red)",
              color: "#fff",
              fontWeight: 800,
              fontSize: 14.5,
              padding: "14px 0",
              borderRadius: 3,
              textDecoration: "none",
            }}
          >
            ₹{total} का भुगतान करें
          </Link>
        ) : (
          <Link
            href="/membership"
            className="jd-ui"
            style={{
              display: "block",
              textAlign: "center",
              background: "var(--jd-navy)",
              color: "#fff",
              fontWeight: 800,
              fontSize: 14.5,
              padding: "14px 0",
              borderRadius: 3,
              textDecoration: "none",
            }}
          >
            प्लान उपलब्ध होने पर लौटें
          </Link>
        )}
        <p className="jd-ui" style={{ marginTop: 12, fontSize: 11.5, color: "var(--jd-muted)", textAlign: "center" }}>
          कोई राशि नहीं काटी जाएगी जब तक लाइव भुगतान चालू नहीं होता।
        </p>
      </main>
    </ReaderShell>
  );
}
