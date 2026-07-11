import { Badge } from "@/design-system/components/Badge";
import { Button } from "@/design-system/components/Button";
import { cn } from "@/design-system/utils/cn";
import { NOSNIPPET_ATTRS } from "@/lib/monetization/seo";
import type { ReaderPlan } from "@/lib/monetization/types";

export type MembershipCardProps = {
  plan: ReaderPlan;
  featured?: boolean;
  className?: string;
  /** Display language for plan copy */
  language?: "en" | "hi";
  onSelect?: () => void;
};

function formatInterval(interval: ReaderPlan["billingInterval"]): string {
  if (interval === "year") return "per year";
  if (interval === "one_time") return "one-time";
  return "per month";
}

/**
 * JDP-020 — Membership plan card.
 * UI only — no checkout or payment integration.
 */
export function MembershipCard({
  plan,
  featured = false,
  className,
  language = "en",
  onSelect,
}: MembershipCardProps) {
  const name = language === "en" ? plan.nameEn : plan.nameHi ?? plan.nameEn;

  return (
    <article
      className={cn(
        "mnv3-membership-card mnv3-enter",
        featured && "mnv3-membership-card--featured",
        className
      )}
      aria-label={`${name} membership plan`}
      {...NOSNIPPET_ATTRS}
    >
      <header className="mnv3-membership-card__header">
        {featured ? (
          <Badge variant="brand" className="mnv3-membership-card__badge">
            Recommended
          </Badge>
        ) : null}
        <h3 className="mnv3-membership-card__name">{name}</h3>
        {plan.nameHi && language === "en" ? (
          <p className="mnv3-membership-card__name-hi">{plan.nameHi}</p>
        ) : null}
        <p className="mnv3-membership-card__price">
          ₹{plan.priceInr.toLocaleString("en-IN")}
          <span className="mnv3-membership-card__interval">
            {formatInterval(plan.billingInterval)}
          </span>
        </p>
      </header>

      {plan.features.length > 0 ? (
        <ul className="mnv3-membership-card__features">
          {plan.features.map((feature) => (
            <li key={feature} className="mnv3-membership-card__feature">
              {feature}
            </li>
          ))}
        </ul>
      ) : null}

      <footer className="mnv3-membership-card__footer">
        <Button
          variant={featured ? "primary" : "outline"}
          size="md"
          disabled
          onClick={onSelect}
          aria-describedby={`plan-note-${plan.id}`}
        >
          Subscribe — opening soon
        </Button>
        <p id={`plan-note-${plan.id}`} className="mnv3-membership-card__note">
          Online checkout is not available yet. Join the newsletter for launch
          updates.
        </p>
      </footer>
    </article>
  );
}
