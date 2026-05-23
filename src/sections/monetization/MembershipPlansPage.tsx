import Link from "next/link";
import { NewsletterSignup } from "@/components/monetization/NewsletterSignup";
import type { ReaderPlan } from "@/lib/monetization/types";

type MembershipPlansPageProps = {
  plans: ReaderPlan[];
  tenantName: string;
};

export function MembershipPlansPage({
  plans,
  tenantName,
}: MembershipPlansPageProps) {
  return (
    <article className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold mb-2">Membership · {tenantName}</h1>
      <p className="text-[var(--ink-muted)] mb-8">
        Support independent journalism. Stripe checkout can be wired to each
        plan&apos;s <code>stripe_price_id</code>.
      </p>

      <div className="mnr-plans mb-10">
        {plans.length ? (
          plans.map((plan) => (
            <div key={plan.id} className="mnr-plan p-4">
              <p className="mnr-plan__price">
                ₹{plan.priceInr}
                <span className="text-sm font-normal text-[var(--ink-muted)]">
                  /{plan.billingInterval}
                </span>
              </p>
              <h2 className="font-semibold">{plan.nameEn}</h2>
              {plan.nameHi ? (
                <p className="text-sm text-[var(--ink-muted)]">{plan.nameHi}</p>
              ) : null}
              <ul className="mt-2 text-sm list-disc pl-4">
                {plan.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              <button
                type="button"
                className="mt-3 px-4 py-2 rounded-lg bg-[var(--brand-maroon)] text-white text-sm font-medium"
                disabled
              >
                Subscribe (Stripe)
              </button>
            </div>
          ))
        ) : (
          <p className="mnr-plan">Plans coming soon — seed via POST /api/monetization/seed</p>
        )}
      </div>

      <NewsletterSignup slotId="membership_page" />

      <p className="mt-8">
        <Link href="/" className="text-[var(--brand-maroon)]">
          ← Back to news
        </Link>
      </p>
    </article>
  );
}
