"use client";

import Link from "next/link";
import { Badge } from "@/design-system/components/Badge";
import { buttonVariants } from "@/design-system/components/Button";
import { cn } from "@/design-system/utils/cn";
import { NOSNIPPET_ATTRS } from "@/lib/monetization/seo";

export type PremiumBannerVariant = "inline" | "full" | "compact";

export type PremiumBannerProps = {
  variant?: PremiumBannerVariant;
  className?: string;
  /** Called when the primary CTA is clicked (analytics hook) */
  onCtaClick?: () => void;
};

const DEFAULT_PERKS = [
  "Ad-light reading",
  "Premium reports",
  "Member newsletters",
];

/**
 * JDP-020 — Premium membership promotion banner.
 * UI only — links to /membership, no payment flow.
 */
export function PremiumBanner({
  variant = "inline",
  className,
  onCtaClick,
}: PremiumBannerProps) {
  return (
    <aside
      className={cn(
        "mnv3-premium-banner mnv3-enter",
        variant === "compact" && "mnv3-premium-banner--compact",
        variant === "full" && "mnv3-premium-banner--full",
        className
      )}
      aria-label="Premium membership"
      {...NOSNIPPET_ATTRS}
    >
      <div className="mnv3-premium-banner__content">
        <p className="mnv3-premium-banner__kicker">Jan Darpan Premium</p>
        <h2 className="mnv3-premium-banner__title">
          {variant === "compact"
            ? "Go ad-light with Premium"
            : "Support independent journalism"}
        </h2>
        {variant !== "compact" ? (
          <>
            <p className="mnv3-premium-banner__desc">
              Help fund on-the-ground reporting across Chhattisgarh. Members get
              deeper briefings, fewer interruptions, and early access to special
              editions.
            </p>
            <ul className="mnv3-premium-banner__perks" aria-label="Member benefits">
              {DEFAULT_PERKS.map((perk) => (
                <li key={perk} className="mnv3-premium-banner__perk">
                  {perk}
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </div>
      <div className="mnv3-premium-banner__actions">
        <Badge variant="brand">Coming soon</Badge>
        <Link
          href="/membership"
          onClick={onCtaClick}
          className={cn(buttonVariants({ variant: "primary", size: "md" }))}
        >
          View plans
        </Link>
      </div>
    </aside>
  );
}
