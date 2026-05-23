"use client";

import Link from "next/link";
import { NOSNIPPET_ATTRS } from "@/lib/monetization/seo";
import { useMonetization } from "@/providers/MonetizationProvider";
import { useLanguage } from "@/providers/LanguageProvider";

type MembershipCTAProps = {
  compact?: boolean;
};

export function MembershipCTA({ compact = false }: MembershipCTAProps) {
  const { plans, track } = useMonetization();
  const { language } = useLanguage();

  if (!plans.length) {
    return (
      <section className="mnr-unit mnr-membership" {...NOSNIPPET_ATTRS}>
        <h3>Member access</h3>
        <p className="anr-meta">
          Ad-free reading, premium reports, and early briefings.
        </p>
        <Link
          href="/membership"
          onClick={() => track("membership_view", { slotId: "membership_cta" })}
        >
          View plans
        </Link>
      </section>
    );
  }

  return (
    <section
      className="mnr-unit mnr-membership"
      role="complementary"
      aria-label="Membership plans"
      {...NOSNIPPET_ATTRS}
    >
      <h3>{language === "en" ? "Subscribe" : "सदस्यता"}</h3>
      {!compact ? (
        <div className="mnr-plans">
          {plans.map((plan) => (
            <div key={plan.id} className="mnr-plan">
              <p className="mnr-plan__price">
                ₹{plan.priceInr}
                <span className="anr-meta">
                  /{plan.billingInterval === "year" ? "yr" : "mo"}
                </span>
              </p>
              <p>{language === "en" ? plan.nameEn : plan.nameHi ?? plan.nameEn}</p>
            </div>
          ))}
        </div>
      ) : null}
      <Link
        href="/membership"
        onClick={() => track("membership_view", { slotId: "story_in_article" })}
      >
        {language === "en" ? "See all plans" : "योजनाएँ देखें"}
      </Link>
    </section>
  );
}
