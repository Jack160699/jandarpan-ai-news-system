import Link from "next/link";
import type { ReaderPlan } from "@/lib/monetization/types";
import {
  PremiumBanner,
  MembershipCard,
  NewsletterSignup,
  DonationCard,
} from "./components";
import "./styles/monetization-v3.css";

export type MembershipExperienceV3Props = {
  plans: ReaderPlan[];
  tenantName: string;
};

/**
 * JDP-020 — Membership page composition (V3 UI).
 * UI only — no payment integration.
 */
export function MembershipExperienceV3({
  plans,
  tenantName,
}: MembershipExperienceV3Props) {
  const featuredIndex = plans.length > 1 ? 1 : 0;

  return (
    <article className="mnv3-page">
      <header className="mnv3-page__header">
        <h1 className="mnv3-page__title">Membership · {tenantName}</h1>
        <p className="mnv3-page__subtitle">
          Support independent journalism in Chhattisgarh. Paid subscriptions are
          opening soon — explore plans below and join the newsletter for launch
          updates.
        </p>
      </header>

      <PremiumBanner variant="full" />

      {plans.length > 0 ? (
        <div className="mnv3-plans-grid">
          {plans.map((plan, index) => (
            <MembershipCard
              key={plan.id}
              plan={plan}
              featured={index === featuredIndex}
            />
          ))}
        </div>
      ) : (
        <p className="mnv3-page__subtitle">
          Plans coming soon — seed via POST /api/monetization/seed
        </p>
      )}

      <div className="mnv3-page__stack">
        <DonationCard />
        <NewsletterSignup slotId="membership_page" />
      </div>

      <p>
        <Link href="/" className="text-[var(--jds-color-brand-primary)]">
          ← Back to news
        </Link>
      </p>
    </article>
  );
}
