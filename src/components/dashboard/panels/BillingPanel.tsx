"use client";

import { useEditorialDesk } from "@/providers/EditorialDeskContext";

const PLANS = [
  {
    id: "starter",
    name: "Starter",
    articles: 500,
    apiCalls: 10_000,
    price: "₹4,999/mo",
  },
  {
    id: "professional",
    name: "Professional",
    articles: 2_000,
    apiCalls: 50_000,
    price: "₹14,999/mo",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    articles: 10_000,
    apiCalls: 250_000,
    price: "Custom",
  },
];

export function BillingPanel() {
  const { data } = useEditorialDesk();
  const billing = data?.billing;

  return (
    <div className="anr-stack">
      <div className="anr-grid anr-grid--3">
        {PLANS.map((plan) => (
          <div
            key={plan.id}
            className={`saas-plan-card ${billing?.planId === plan.id ? "anr-card--highlight" : ""}`}
          >
            <p className="saas-plan-card__name">{plan.name}</p>
            <p className="anr-meta">{plan.price}</p>
            <p className="anr-meta">
              {plan.articles.toLocaleString()} articles ·{" "}
              {plan.apiCalls.toLocaleString()} API calls
            </p>
            {billing?.planId === plan.id ? (
              <span className="anr-pill anr-pill--ok">Current plan</span>
            ) : (
              <button type="button" className="anr-btn anr-btn--ghost" disabled>
                Upgrade (Stripe)
              </button>
            )}
          </div>
        ))}
      </div>

      {billing ? (
        <div className="anr-card">
          <h2 className="anr-card__title">Usage this period</h2>
          <p className="anr-meta">Status · {billing.planStatus}</p>
          <div className="saas-kpi-grid">
            <div className="saas-kpi">
              <div className="saas-kpi__value">
                {billing.articlesUsed} / {billing.articlesLimit}
              </div>
              <div className="saas-kpi__label">Articles</div>
            </div>
            <div className="saas-kpi">
              <div className="saas-kpi__value">
                {billing.apiCallsUsed} / {billing.apiCallsLimit}
              </div>
              <div className="saas-kpi__label">API calls</div>
            </div>
          </div>
          {billing.stripeCustomerId ? (
            <p className="anr-meta">
              Stripe customer · {billing.stripeCustomerId}
            </p>
          ) : (
            <p className="anr-meta">
              Billing-ready — connect Stripe Customer + Subscription IDs in
              tenant_billing
            </p>
          )}
          {billing.currentPeriodEnd ? (
            <p className="anr-meta">
              Renews · {new Date(billing.currentPeriodEnd).toLocaleDateString()}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
