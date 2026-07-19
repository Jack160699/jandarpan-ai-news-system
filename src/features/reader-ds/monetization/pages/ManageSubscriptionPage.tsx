"use client";

import Link from "next/link";
import { useState } from "react";
import { Masthead } from "../../components/Masthead";
import { ReaderShell } from "../../components/ReaderShell";
import { JdIcon } from "../../components/icons";
import { SettingRow } from "../../experience/components/SettingRow";
import { useReaderAccount } from "@/providers/ReaderAccountProvider";

/** E42 — manage subscription from real isPremium; no cancel API invented. */
export function ManageSubscriptionPage() {
  const { isPremium, isLoggedIn } = useReaderAccount();
  const [autoRenew, setAutoRenew] = useState(true);
  const [confirmCancel, setConfirmCancel] = useState(false);

  return (
    <ReaderShell activeNav="more">
      <Masthead back backHref="/archive" pageTitle="सदस्यता" />
      <main id="main-content" role="main" style={{ flex: 1, overflow: "auto" }}>
        <div
          style={{
            margin: "14px 16px",
            background: "linear-gradient(135deg, var(--jd-navy), var(--jd-navy-deep))",
            borderRadius: 4,
            padding: 16,
            color: "var(--jd-paper)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <JdIcon name="star" size={18} stroke={1.8} color="var(--jd-gold)" />
            <span className="jd-ui" style={{ fontSize: 13, fontWeight: 800, color: "var(--jd-gold-soft)" }}>
              {isPremium ? "प्रीमियम · सक्रिय" : "सदस्यता सक्रिय नहीं"}
            </span>
          </div>
          <div className="jd-ui" style={{ fontSize: 11.5, color: "#8ea0c4" }}>
            {isPremium
              ? "अगली बिलिंग व रसीदें खाता से जुड़ने पर दिखेंगी।"
              : isLoggedIn
                ? "प्लान चुनकर सदस्यता शुरू करें — चेकआउट जल्द लाइव होगा।"
                : "साइन इन करें या प्लान देखें।"}
          </div>
        </div>

        <SettingRow icon="star" label="प्लान बदलें" sub="मासिक/वार्षिक में स्विच" href="/membership/plans" />
        <SettingRow
          icon="download"
          label="रसीदें व चालान"
          sub={isPremium ? "उपलब्ध होने पर यहाँ" : "सदस्यता के बाद"}
        />
        <SettingRow
          label="ऑटो-रिन्यू"
          sub="नवीनीकरण से पहले याद दिलाएँ"
          toggle={autoRenew}
          onToggle={setAutoRenew}
        />
        <SettingRow icon="rupee" label="भुगतान विधि" sub="लाइव चेकआउट के बाद सेट होगी" />

        <div style={{ padding: 16, marginTop: 4 }}>
          {!confirmCancel ? (
            <button
              type="button"
              className="jd-ui"
              onClick={() => setConfirmCancel(true)}
              disabled={!isPremium}
              style={{
                width: "100%",
                textAlign: "center",
                fontSize: 13,
                fontWeight: 700,
                color: isPremium ? "var(--jd-red)" : "var(--jd-muted)",
                background: "none",
                border: "none",
                cursor: isPremium ? "pointer" : "not-allowed",
                minHeight: 44,
              }}
            >
              सदस्यता रद्द करें
            </button>
          ) : (
            <div style={{ textAlign: "center" }}>
              <p className="jd-ui" style={{ fontSize: 13, color: "var(--jd-ink-2)", marginBottom: 12 }}>
                रद्दीकरण अभी सर्वर पर उपलब्ध नहीं — सहायता से संपर्क करें।
              </p>
              <Link
                href="/contact"
                className="jd-ui"
                style={{ fontSize: 13, fontWeight: 700, color: "var(--jd-navy)" }}
              >
                सहायता
              </Link>
              {" · "}
              <button
                type="button"
                className="jd-ui"
                onClick={() => setConfirmCancel(false)}
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: "var(--jd-muted)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                वापस
              </button>
            </div>
          )}
        </div>
      </main>
    </ReaderShell>
  );
}
