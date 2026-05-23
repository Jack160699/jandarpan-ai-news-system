"use client";

import Link from "next/link";
import { NOSNIPPET_ATTRS } from "@/lib/monetization/seo";
import { useMonetization } from "@/providers/MonetizationProvider";

export function PremiumReportsRail() {
  const { premiumReports, settings, track } = useMonetization();

  if (!settings.premiumReportsEnabled || !premiumReports.length) {
    return null;
  }

  return (
    <section
      className="mnr-unit"
      aria-label="Premium reports"
      {...NOSNIPPET_ATTRS}
    >
      <span className="mnr-label">Premium</span>
      <div className="mnr-plans">
        {premiumReports.slice(0, 3).map((r) => (
          <Link
            key={r.id}
            href={`/premium/${r.slug}`}
            className="mnr-premium-card"
            onClick={() =>
              track("premium_teaser_click", {
                slotId: "premium_rail",
                articleSlug: r.slug,
              })
            }
          >
            <strong>{r.title}</strong>
            {r.excerpt ? <p className="anr-meta">{r.excerpt}</p> : null}
            <p className="mnr-plan__price">
              {r.isPaywalled ? `₹${r.priceInr}` : "Free"}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
