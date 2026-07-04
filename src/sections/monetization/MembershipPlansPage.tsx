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
        Support independent journalism in Chhattisgarh. Paid subscriptions are
        opening soon — join the newsletter below for launch updates.
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
              <p className="mt-3 text-sm text-[var(--ink-muted)]">
                Online checkout opens soon. Subscribe to the newsletter for launch
                updates.
              </p>
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
