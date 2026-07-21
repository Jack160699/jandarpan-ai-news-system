"use client";

import Link from "next/link";

/**
 * Compact Reader DS entry to verified rate history pages.
 * Does not show fake prices or trend arrows.
 * Hidden until at least one accepted verified snapshot exists (server-gated).
 */
export function VerifiedRatesLinks({ enabled = false }: { enabled?: boolean }) {
  if (!enabled) return null;

  return (
    <aside
      className="jd-ui jd-verified-rates-links"
      data-jd-verified-rates-links
      style={{
        margin: "8px 14px",
        padding: "10px 12px",
        borderTop: "1px solid var(--jd-line-2)",
        borderBottom: "1px solid var(--jd-line-2)",
        fontSize: 13,
        lineHeight: 1.45,
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 4 }}>सत्यापित दरें / इतिहास</div>
      <p style={{ margin: "0 0 6px", color: "var(--jd-ink-2)" }}>
        पेट्रोल·डीजल·सोना·चांदी — केवल सत्यापित डेटा; काल्पनिक ट्रेंड नहीं।
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 12px" }}>
        <Link href="/rates/chhattisgarh/raipur/petrol-price-today">इतिहास देखें (पेट्रोल)</Link>
        <Link href="/rates/chhattisgarh/gold-price-today">ग्राफ देखें (सोना)</Link>
        <Link href="/rates/chhattisgarh">सभी दरें</Link>
      </div>
    </aside>
  );
}
