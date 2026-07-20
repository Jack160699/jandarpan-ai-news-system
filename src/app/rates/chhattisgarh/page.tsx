import Link from "next/link";
import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { FUEL_CITY_SLUGS, cityDisplay } from "@/lib/verified-rates/catalog";
import { getRateHistory } from "@/lib/verified-rates/service";
import { webPageJsonLd } from "@/lib/seo/json-ld";

export const metadata: Metadata = buildPageMetadata({
  title: "छत्तीसगढ़ पेट्रोल, डीजल, सोना, चांदी दरें | जन दर्पण",
  description:
    "छत्तीसगढ़ के समर्थित शहरों की ईंधन दरें और संकेतात्मक बुलियन बेंचमार्क — सत्यापित इतिहास के साथ।",
  path: "/rates/chhattisgarh",
  locale: "hi_IN",
  section: "rates",
});

export default async function CgRatesHubPage() {
  const summaries = await Promise.all(
    FUEL_CITY_SLUGS.flatMap((city) =>
      (["petrol", "diesel"] as const).map(async (category) => {
        const h = await getRateHistory({ category, citySlug: city, range: "MAX" });
        return { city, category, h };
      })
    )
  );

  const bullion = await Promise.all(
    (["gold_24k", "gold_22k", "silver_999"] as const).map(async (category) => {
      const h = await getRateHistory({ category, citySlug: null, range: "MAX" });
      return { category, h };
    })
  );

  const jsonLd = webPageJsonLd(
    "छत्तीसगढ़ दरें",
    "समर्थित स्थानों का सत्यापित सारांश",
    "/rates/chhattisgarh"
  );

  return (
    <main style={{ maxWidth: 800, margin: "0 auto", padding: 16 }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <h1>छत्तीसगढ़ दरें</h1>
      <p>
        नीचे केवल समर्थित संयोजन हैं। अनुपलब्ध अवस्था का अर्थ काल्पनिक कीमत नहीं — स्रोत
        सत्यापन लंबित या अवरुद्ध हो सकता है।
      </p>

      <h2>ईंधन सारांश</h2>
      <ul>
        {summaries.map(({ city, category, h }) => {
          const path = `/rates/chhattisgarh/${city}/${category}-price-today`;
          const label = `${cityDisplay(city)} ${category === "petrol" ? "पेट्रोल" : "डीजल"}`;
          const price =
            !("error" in h) && h.current.price ? `₹${h.current.price}` : "अनुपलब्ध";
          const when =
            !("error" in h) && h.current.effectiveDate
              ? h.current.effectiveDate
              : "—";
          return (
            <li key={path}>
              <Link href={path}>{label}</Link> — {price} · {when}
            </li>
          );
        })}
      </ul>

      <h2>बुलियन सारांश (संकेतात्मक)</h2>
      <ul>
        {bullion.map(({ category, h }) => {
          const slug =
            category === "gold_24k"
              ? "gold-price-today"
              : category === "gold_22k"
                ? "gold-22k-price-today"
                : "silver-price-today";
          const path = `/rates/chhattisgarh/${slug}`;
          const label =
            category === "gold_24k"
              ? "सोना 24K"
              : category === "gold_22k"
                ? "सोना 22K"
                : "चांदी 999";
          const price =
            !("error" in h) && h.current.price ? `₹${h.current.price}` : "अनुपलब्ध";
          return (
            <li key={path}>
              <Link href={path}>{label}</Link> — {price}
            </li>
          );
        })}
      </ul>

      <p>
        <Link href="/rates/methodology">पद्धति</Link> ·{" "}
        <Link href="/rates/chhattisgarh/dataset">डेटासेट</Link>
      </p>
    </main>
  );
}
