import Link from "next/link";
import { JdIcon } from "../../components/icons";

/** E43 — editorial replacement where an ad slot would sit for members. */
export function PremiumExclusiveStrip({
  href = "/membership",
  title = "एक्सक्लूसिव सदस्य सामग्री",
}: {
  href?: string;
  title?: string;
}) {
  return (
    <Link
      href={href}
      style={{
        margin: "6px 14px",
        border: "1px solid var(--jd-gold)",
        borderRadius: 3,
        padding: "11px 13px",
        background: "#fbf3e6",
        display: "flex",
        alignItems: "center",
        gap: 10,
        textDecoration: "none",
        color: "inherit",
      }}
    >
      <JdIcon name="eye" size={20} stroke={1.8} color="var(--jd-amber, #c07a1e)" />
      <div>
        <div
          className="jd-ui"
          style={{
            fontSize: 9.5,
            fontWeight: 800,
            letterSpacing: ".08em",
            color: "var(--jd-amber, #c07a1e)",
          }}
        >
          प्रीमियम · विज्ञापन के बदले
        </div>
        <div className="jd-serif" style={{ fontSize: 14, fontWeight: 600, color: "var(--jd-ink)" }}>
          {title}
        </div>
      </div>
    </Link>
  );
}
