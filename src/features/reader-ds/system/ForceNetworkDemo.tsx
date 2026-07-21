"use client";

import { useEffect } from "react";
import { Masthead } from "../components/Masthead";
import { ReaderShell } from "../components/ReaderShell";
import { Tag } from "../components/primitives";

/** QA-only demos for F49/F50 — forces banner visibility via DOM attrs. */
export function ForceNetworkDemo({ mode }: { mode: "offline" | "slow" }) {
  useEffect(() => {
    const root = document.documentElement;
    if (mode === "slow") {
      root.setAttribute("data-jd-force-slow", "1");
    } else {
      root.setAttribute("data-jd-force-offline", "1");
    }
    window.dispatchEvent(new Event(mode === "offline" ? "offline" : "online"));
    return () => {
      root.removeAttribute("data-jd-force-slow");
      root.removeAttribute("data-jd-force-offline");
    };
  }, [mode]);

  return (
    <ReaderShell activeNav="home" showPermissionSheets={false}>
      <Masthead hideActions />
      <main id="main-content" role="main" className="jd-shell" style={{ padding: "12px 16px", flex: 1 }}>
        {mode === "offline" ? (
          <>
            <div
              className="jd-ui"
              style={{
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: ".08em",
                color: "var(--jd-muted)",
                marginBottom: 8,
              }}
            >
              ऑफ़लाइन उपलब्ध
            </div>
            <p className="jd-serif" style={{ fontSize: 14.5, fontWeight: 600, margin: "0 0 16px" }}>
              सहेजे लेख व डाउनलोड ऑडियो यहाँ दिखेंगे जब उपलब्ध हों।
            </p>
            <a
              href="/archive/saved"
              className="jd-ui"
              style={{
                display: "block",
                textAlign: "center",
                border: "1.5px solid var(--jd-navy)",
                color: "var(--jd-navy)",
                fontWeight: 700,
                fontSize: 13,
                padding: "11px 0",
                borderRadius: 3,
                textDecoration: "none",
              }}
            >
              पुनः कनेक्ट करने का प्रयास
            </a>
          </>
        ) : (
          <>
            <Tag>राजनीति</Tag>
            <h2 className="jd-serif" style={{ margin: "6px 0 8px", fontSize: 20, lineHeight: 1.3, fontWeight: 700 }}>
              विधानसभा में नई औद्योगिक नीति पेश
            </h2>
            <div
              style={{
                height: 150,
                borderRadius: 2,
                background: "var(--jd-paper-2)",
                border: "1px dashed var(--jd-line)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                marginBottom: 12,
              }}
            >
              <span className="jd-ui" style={{ fontSize: 10.5, color: "var(--jd-muted)" }}>
                इमेज स्थगित · टेक्स्ट-प्रथम लोड
              </span>
            </div>
            <p className="jd-ui" style={{ fontSize: 14, lineHeight: 1.7, color: "var(--jd-ink-2)", margin: 0 }}>
              रायपुर। विधानसभा के मानसून सत्र में सरकार ने नई औद्योगिक नीति पेश की, जिसमें इस्पात, खनन और नवीकरणीय
              ऊर्जा को केंद्र में रखा गया है।
            </p>
          </>
        )}
      </main>
    </ReaderShell>
  );
}
