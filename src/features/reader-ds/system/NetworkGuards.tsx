"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { JdIcon } from "../components/icons";
import { saveExperiencePrefs } from "../experience/prefs";

/**
 * F49 offline banner + F50 slow-connection strip.
 * Mounted once inside ExperienceChrome / ReaderShell.
 */
export function NetworkGuards() {
  const [offline, setOffline] = useState(false);
  const [slow, setSlow] = useState(false);
  const [dismissSlow, setDismissSlow] = useState(false);

  useEffect(() => {
    const sync = () => {
      const forced =
        typeof document !== "undefined" &&
        document.documentElement.getAttribute("data-jd-force-offline") === "1";
      setOffline(forced || (typeof navigator !== "undefined" && !navigator.onLine));
    };
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);

    const conn = (navigator as Navigator & {
      connection?: {
        effectiveType?: string;
        addEventListener?: (t: string, fn: () => void) => void;
        removeEventListener?: (t: string, fn: () => void) => void;
      };
    }).connection;
    const checkSlow = () => {
      const forced =
        typeof document !== "undefined" &&
        document.documentElement.getAttribute("data-jd-force-slow") === "1";
      const t = conn?.effectiveType;
      setSlow(forced || t === "2g" || t === "slow-2g");
    };
    checkSlow();
    conn?.addEventListener?.("change", checkSlow);
    const mo = new MutationObserver(() => {
      sync();
      checkSlow();
    });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-jd-force-offline", "data-jd-force-slow"] });

    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
      conn?.removeEventListener?.("change", checkSlow);
      mo.disconnect();
    };
  }, []);

  const enableDataSaving = () => {
    saveExperiencePrefs({ dataSaving: true });
    setDismissSlow(true);
  };

  return (
    <>
      {offline ? (
        <div
          role="status"
          aria-live="polite"
          className="jd-ui"
          style={{
            flexShrink: 0,
            background: "var(--jd-ink)",
            color: "#fff",
            padding: "9px 14px",
            display: "flex",
            alignItems: "center",
            gap: 9,
            zIndex: 60,
          }}
        >
          <JdIcon name="wifiOff" size={18} stroke={1.9} color="#fff" />
          <span style={{ flex: 1, fontSize: 12, fontWeight: 600 }}>
            आप ऑफ़लाइन हैं —{" "}
            <Link href="/archive/saved" style={{ color: "var(--jd-gold-soft)", fontWeight: 800 }}>
              सहेजी सामग्री
            </Link>{" "}
            उपलब्ध है
          </span>
        </div>
      ) : null}

      {!offline && slow && !dismissSlow ? (
        <div
          role="status"
          aria-live="polite"
          className="jd-ui"
          style={{
            flexShrink: 0,
            background: "#f7eccf",
            borderBottom: "1px solid var(--jd-gold)",
            padding: "8px 14px",
            display: "flex",
            alignItems: "center",
            gap: 9,
            zIndex: 59,
          }}
        >
          <JdIcon name="wifi" size={17} stroke={1.9} color="var(--jd-amber)" />
          <span style={{ flex: 1, fontSize: 11.5, fontWeight: 700, color: "#7a5a12" }}>
            धीमा नेटवर्क — टेक्स्ट पहले लोड हो रहा है
          </span>
          <button
            type="button"
            onClick={enableDataSaving}
            className="jd-ui"
            style={{
              fontSize: 11,
              fontWeight: 800,
              color: "var(--jd-red)",
              background: "none",
              border: "none",
              cursor: "pointer",
              minHeight: 44,
            }}
          >
            डेटा-बचत
          </button>
        </div>
      ) : null}
    </>
  );
}
