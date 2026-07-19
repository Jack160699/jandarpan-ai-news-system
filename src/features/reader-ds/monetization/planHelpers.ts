import type { ReaderPlan } from "@/lib/monetization/types";

export type DisplayPlan = {
  id: string;
  name: string;
  priceLabel: string;
  priceInr: number;
  interval: "month" | "year" | "one_time";
  blurb: string;
  recommended: boolean;
  slug: string;
  isFree: boolean;
  comingSoon: boolean;
};

/** Map real DB plans into comparison cards; always include free tier. */
export function buildDisplayPlans(plans: ReaderPlan[], yearly: boolean): DisplayPlan[] {
  const free: DisplayPlan = {
    id: "free",
    name: "बेसिक",
    priceLabel: "₹0",
    priceInr: 0,
    interval: "month",
    blurb: "विज्ञापन सहित · मूल ख़बरें",
    recommended: false,
    slug: "free",
    isFree: true,
    comingSoon: false,
  };

  const paid = plans
    .filter((p) =>
      yearly ? p.billingInterval === "year" : p.billingInterval === "month" || p.billingInterval === "one_time"
    )
    .map((p, i) => {
      const name = p.nameHi?.trim() || p.nameEn;
      const features = p.features?.slice(0, 3).join(" · ") || "सदस्य लाभ";
      return {
        id: p.id,
        name,
        priceLabel: `₹${p.priceInr}`,
        priceInr: p.priceInr,
        interval: p.billingInterval,
        blurb: features,
        recommended: i === 0 && p.priceInr > 0,
        slug: p.slug,
        isFree: p.priceInr === 0,
        comingSoon: false,
      } satisfies DisplayPlan;
    });

  if (paid.length === 0) {
    return [
      free,
      {
        id: "premium-soon",
        name: "प्रीमियम",
        priceLabel: yearly ? "—" : "—",
        priceInr: 0,
        interval: yearly ? "year" : "month",
        blurb: "विज्ञापन-मुक्त · ई-पेपर · ऑडियो — चेकआउट जल्द",
        recommended: true,
        slug: "premium",
        isFree: false,
        comingSoon: true,
      },
    ];
  }

  const hasRecommended = paid.some((p) => p.recommended);
  if (!hasRecommended && paid[0]) paid[0].recommended = true;

  return [free, ...paid].slice(0, 4);
}

export function yearlySavingsHint(plans: ReaderPlan[]): string | null {
  const month = plans.find((p) => p.billingInterval === "month" && p.priceInr > 0);
  const year = plans.find((p) => p.billingInterval === "year" && p.priceInr > 0);
  if (!month || !year) return "वार्षिक";
  const full = month.priceInr * 12;
  if (full <= year.priceInr) return "वार्षिक";
  const pct = Math.round(((full - year.priceInr) / full) * 100);
  return `वार्षिक · ${pct}% बचत`;
}
