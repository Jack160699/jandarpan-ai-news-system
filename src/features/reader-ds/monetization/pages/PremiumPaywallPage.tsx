import Link from "next/link";
import { Masthead } from "../../components/Masthead";
import { ReaderShell } from "../../components/ReaderShell";
import { Tag } from "../../components/primitives";
import { JdIcon } from "../../components/icons";
import { Byline } from "../../article/components/Byline";

type PaywallReport = {
  slug: string;
  title: string;
  excerpt?: string | null;
  price_inr?: number | null;
  author?: string | null;
};

/** E38 — preview + fade + paywall card for premium reports. */
export function PremiumPaywallPage({ report }: { report: PaywallReport }) {
  const price =
    typeof report.price_inr === "number" && report.price_inr > 0
      ? `₹${report.price_inr}`
      : "₹49/माह";

  const preview =
    report.excerpt?.trim() ||
    "यह गहन विश्लेषण सदस्य पाठकों के लिए उपलब्ध है। पूर्वावलोकन नीचे है।";

  return (
    <ReaderShell activeNav="home" hideBottomNav reserveMiniPlayer={false}>
      <Masthead back backHref="/" />
      <main id="main-content" role="main" style={{ flex: 1, overflow: "auto" }}>
        <div style={{ padding: "12px 16px 0", position: "relative" }}>
          <Tag>गहन विश्लेषण · प्रीमियम</Tag>
          <h1
            className="jd-serif"
            style={{
              margin: "6px 0 8px",
              fontSize: 22,
              lineHeight: 1.3,
              fontWeight: 700,
              overflowWrap: "anywhere",
            }}
          >
            {report.title}
          </h1>
          <Byline
            author={report.author?.trim() || "जनदर्पण प्रीमियम"}
            role="विशेष रिपोर्ट"
          />
          <div style={{ position: "relative", maxHeight: 120, overflow: "hidden" }}>
            <p
              className="jd-serif"
              style={{
                margin: "0 0 12px",
                fontSize: 15,
                lineHeight: 1.75,
                color: "var(--jd-ink-2)",
              }}
            >
              {preview}
            </p>
            <div
              aria-hidden
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: 0,
                height: 80,
                background: "linear-gradient(transparent, var(--jd-paper))",
              }}
            />
          </div>
        </div>

        <div
          style={{
            margin: "0 16px 16px",
            border: "1.5px solid var(--jd-gold)",
            borderRadius: 4,
            padding: "18px",
            textAlign: "center",
            background: "#fbf3e6",
          }}
        >
          <JdIcon name="lock" size={26} stroke={1.8} color="var(--jd-amber, #c07a1e)" />
          <div
            className="jd-serif"
            style={{ fontSize: 17, fontWeight: 700, margin: "8px 0 4px", color: "var(--jd-ink)" }}
          >
            यह एक प्रीमियम लेख है
          </div>
          <div className="jd-ui" style={{ fontSize: 12.5, color: "var(--jd-ink-3)", marginBottom: 14 }}>
            पूरा विश्लेषण पढ़ने के लिए सदस्य बनें।
          </div>
          <Link
            href="/membership/plans"
            className="jd-ui"
            style={{
              display: "block",
              background: "var(--jd-red)",
              color: "#fff",
              fontWeight: 800,
              fontSize: 13.5,
              padding: "12px 0",
              borderRadius: 3,
              marginBottom: 8,
              textDecoration: "none",
            }}
          >
            {price} — सदस्य बनें
          </Link>
          <div className="jd-ui" style={{ fontSize: 12, color: "var(--jd-navy)" }}>
            सदस्य हैं?{" "}
            <Link href="/login" style={{ fontWeight: 700, textDecoration: "underline", color: "inherit" }}>
              साइन इन करें
            </Link>
          </div>
        </div>
      </main>
    </ReaderShell>
  );
}
