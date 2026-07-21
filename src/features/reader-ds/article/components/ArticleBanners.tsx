import Link from "next/link";
import { JdIcon } from "../../components/icons";
import type { SponsoredStoryMeta } from "@/lib/monetization/types";

export function BreakingBanner({ updatedLabel }: { updatedLabel?: string | null }) {
  return (
    <div
      className="jd-ui"
      style={{
        flexShrink: 0,
        background: "var(--jd-red)",
        color: "#fff",
        padding: "9px 16px",
        display: "flex",
        alignItems: "center",
        gap: 9,
      }}
    >
      <span
        aria-hidden
        style={{ width: 8, height: 8, borderRadius: 8, background: "#fff", flexShrink: 0 }}
      />
      <span style={{ fontWeight: 800, fontSize: 12, letterSpacing: ".08em" }}>ब्रेकिंग न्यूज़</span>
      {updatedLabel ? (
        <span style={{ marginLeft: "auto", fontSize: 10.5, opacity: 0.9 }}>अपडेट {updatedLabel}</span>
      ) : null}
    </div>
  );
}

export function SponsoredBanner({
  sponsored,
}: {
  sponsored?: SponsoredStoryMeta | null;
}) {
  return (
    <div
      className="jd-ui"
      style={{
        flexShrink: 0,
        background: "#efe7d6",
        borderBottom: "1px solid var(--jd-gold)",
        padding: "9px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
      }}
    >
      <div>
        <div
          style={{
            fontSize: 9.5,
            fontWeight: 800,
            letterSpacing: ".1em",
            color: "var(--jd-amber)",
            textTransform: "uppercase",
          }}
        >
          प्रायोजित सामग्री
        </div>
        {sponsored?.sponsorName ? (
          <div style={{ fontSize: 11, color: "var(--jd-ink-3)" }}>
            प्रस्तुत: {sponsored.sponsorName}
          </div>
        ) : null}
      </div>
      <span style={{ fontSize: 10.5, color: "var(--jd-navy)", textDecoration: "underline" }}>
        यह क्यों?
      </span>
    </div>
  );
}

export function PremiumRibbon() {
  return (
    <div
      className="jd-ui"
      style={{
        flexShrink: 0,
        background: "linear-gradient(90deg, var(--jd-navy), var(--jd-navy-deep))",
        padding: "7px 16px",
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}
    >
      <JdIcon name="star" size={15} stroke={1.8} color="var(--jd-gold)" />
      <span
        style={{
          fontSize: 10.5,
          fontWeight: 800,
          letterSpacing: ".1em",
          color: "var(--jd-gold-soft)",
        }}
      >
        दर्पण प्रीमियम · विज्ञापन-मुक्त
      </span>
    </div>
  );
}

export function OpinionBadge({ editorial = false }: { editorial?: boolean }) {
  return (
    <div
      className="jd-ui"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 10,
        fontWeight: 800,
        letterSpacing: ".1em",
        color: "var(--jd-amber)",
        border: "1px solid var(--jd-gold)",
        padding: "4px 10px",
        borderRadius: 2,
        marginBottom: 12,
      }}
    >
      <JdIcon name="flag" size={13} stroke={1.8} color="var(--jd-amber)" />
      {editorial ? "राय · संपादकीय दृष्टिकोण" : "राय · ओपिनियन"}
    </div>
  );
}

export function ExplainerBadge({ count = 5 }: { count?: number }) {
  return (
    <div
      className="jd-ui"
      style={{
        display: "inline-block",
        fontSize: 10,
        fontWeight: 800,
        letterSpacing: ".1em",
        color: "#fff",
        background: "var(--jd-navy)",
        padding: "4px 10px",
        borderRadius: 2,
        marginBottom: 10,
      }}
    >
      समझिए · {count} सवालों में
    </div>
  );
}

export function ProgressBar({ progress = 0.35 }: { progress?: number }) {
  const pct = Math.max(0, Math.min(1, progress)) * 100;
  return (
    <div style={{ flexShrink: 0, height: 3, background: "var(--jd-line)" }}>
      <div style={{ width: `${pct}%`, height: 3, background: "var(--jd-gold)" }} />
    </div>
  );
}

export function MembershipCta({ href = "/membership" }: { href?: string }) {
  return (
    <Link
      href={href}
      className="jd-ui"
      style={{
        display: "block",
        textAlign: "center",
        background: "var(--jd-navy)",
        color: "#fff",
        fontWeight: 800,
        fontSize: 13,
        padding: "12px 0",
        borderRadius: 3,
        textDecoration: "none",
        marginTop: 16,
      }}
    >
      सदस्यता देखें
    </Link>
  );
}
