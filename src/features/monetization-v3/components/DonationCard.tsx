"use client";

import { useState } from "react";
import { Button } from "@/design-system/components/Button";
import { cn } from "@/design-system/utils/cn";
import { NOSNIPPET_ATTRS } from "@/lib/monetization/seo";

export type DonationCardProps = {
  suggestedAmounts?: number[];
  className?: string;
  title?: string;
  description?: string;
};

const DEFAULT_AMOUNTS = [99, 249, 499, 999];

/**
 * JDP-020 — Donation support card.
 * UI only — no payment or checkout integration.
 */
export function DonationCard({
  suggestedAmounts = DEFAULT_AMOUNTS,
  className,
  title = "Support our journalism",
  description = "One-time contributions help fund district reporting, translation, and field coverage across Chhattisgarh.",
}: DonationCardProps) {
  const [selected, setSelected] = useState<number | null>(suggestedAmounts[1] ?? null);
  const [custom, setCustom] = useState("");

  const displayAmount = custom.trim()
    ? Number(custom)
    : selected;

  return (
    <section
      className={cn("mnv3-donation mnv3-enter", className)}
      aria-label="Donation"
      {...NOSNIPPET_ATTRS}
    >
      <h3 className="mnv3-donation__title">{title}</h3>
      <p className="mnv3-donation__desc">{description}</p>

      <div
        className="mnv3-donation__amounts"
        role="group"
        aria-label="Suggested donation amounts"
      >
        {suggestedAmounts.map((amount) => (
          <button
            key={amount}
            type="button"
            className={cn(
              "mnv3-donation__amount",
              selected === amount && !custom.trim() && "mnv3-donation__amount--selected"
            )}
            onClick={() => {
              setSelected(amount);
              setCustom("");
            }}
            aria-pressed={selected === amount && !custom.trim()}
          >
            ₹{amount}
          </button>
        ))}
      </div>

      <div className="mnv3-donation__custom">
        <span className="mnv3-donation__custom-label">Custom</span>
        <input
          type="number"
          min={1}
          inputMode="numeric"
          className="mnv3-donation__custom-input"
          placeholder="Amount"
          value={custom}
          onChange={(e) => {
            setCustom(e.target.value);
            setSelected(null);
          }}
          aria-label="Custom donation amount in rupees"
        />
      </div>

      <Button
        variant="primary"
        size="md"
        disabled
        aria-describedby="donation-note"
      >
        {displayAmount && !Number.isNaN(displayAmount) && displayAmount > 0
          ? `Donate ₹${displayAmount} — coming soon`
          : "Donate — coming soon"}
      </Button>

      <p id="donation-note" className="mnv3-donation__note">
        Online donations are not available yet. This preview shows the planned
        support experience.
      </p>
    </section>
  );
}
