"use client";

import { Masthead } from "../components/Masthead";
import { ReaderShell } from "../components/ReaderShell";
import { StateBody } from "./StateBody";

/** F48 — calm general error. */
export function ErrorStatePage({
  reset,
  code = "JD-500",
}: {
  reset?: () => void;
  code?: string;
}) {
  return (
    <ReaderShell activeNav="home" reserveMiniPlayer={false} showPermissionSheets={false}>
      <Masthead back backHref="/" />
      <StateBody
        icon="alert"
        iconBg="rgba(158,27,34,.08)"
        iconColor="var(--jd-red)"
        title="कुछ ठीक नहीं चला"
        body="हम इस सामग्री को लोड नहीं कर सके। कृपया थोड़ी देर बाद पुनः प्रयास करें।"
        primary={{ label: "पुनः प्रयास करें", onClick: reset }}
        secondary={{ label: "समस्या रिपोर्ट करें", href: "/contact" }}
      >
        <p
          className="jd-ui"
          style={{
            marginTop: 16,
            fontFamily: "ui-monospace, monospace",
            fontSize: 10,
            color: "var(--jd-muted)",
          }}
        >
          त्रुटि कोड: {code}
        </p>
      </StateBody>
    </ReaderShell>
  );
}
