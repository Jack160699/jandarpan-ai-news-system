"use client";

import { useEffect, useState } from "react";
import type { DashboardBillingPlan } from "@/lib/dashboard/types";

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
  const [billing, setBilling] = useState<DashboardBillingPlan | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/billing", {
          credentials: "include",
          cache: "no-store",
        });
        const json = await res.json();
        if (!res.ok || !json.ok) {
          if (!cancelled) setError(json.error ?? "Failed to load billing");
          return;
        }
        if (!cancelled) setBilling(json.billing as DashboardBillingPlan);
      } catch {
        if (!cancelled) setError("Network error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return <p className="anr-meta">{error}</p>;
  }

  return (
    <div className="anr-stack">
      <div className="anr-grid anr-grid--3">
        {PLANS.map((plan) => (
          <div
            key={plan.id}
            className={`anr-plan-card ${billing?.planId === plan.id ? "anr-card--highlight" : ""}`}
          >
            <p className="anr-plan-card__name">{plan.name}</p>
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
          <div className="anr-kpi-grid">
            <div className="anr-kpi">
              <div className="anr-kpi__value">
                {billing.articlesUsed} / {billing.articlesLimit}
              </div>
              <div className="anr-kpi__label">Articles</div>
            </div>
            <div className="anr-kpi">
              <div className="anr-kpi__value">
                {billing.apiCallsUsed} / {billing.apiCallsLimit}
              </div>
              <div className="anr-kpi__label">API calls</div>
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
