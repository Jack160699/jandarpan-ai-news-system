import Link from "next/link";
import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { FUEL_CITY_SLUGS, cityDisplay, getCategoryMeta } from "@/lib/verified-rates/catalog";
import { webPageJsonLd } from "@/lib/seo/json-ld";

export const metadata: Metadata = buildPageMetadata({
  title: "छत्तीसगढ़ दरें – पेट्रोल, डीजल, सोना, चांदी | जन दर्पण",
  description:
    "रायपुर, दुर्ग, भिलाई पेट्रोल-डीजल और छत्तीसगढ़ संकेतात्मक सोना-चांदी दरों का सत्यापित हब। इतिहास, पद्धति और ईमानदार अनुपलब्ध अवस्थाएँ।",
  path: "/rates",
  locale: "hi_IN",
  section: "rates",
});

export default function RatesHubPage() {
  const jsonLd = webPageJsonLd(
    "छत्तीसगढ़ दरें",
    "सत्यापित ईंधन और बुलियन दर हब",
    "/rates"
  );

  return (
    <main style={{ maxWidth: 800, margin: "0 auto", padding: 16 }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <h1>दरें — जन दर्पण</h1>
      <p>
        यह हब केवल समर्थित स्थानों और श्रेणियों के लिए सत्यापित दरें दिखाता है। बिना
        लाइसेंसशुदा स्रोत के कीमतें गढ़ी नहीं जातीं।
      </p>
      <p>
        <Link href="/rates/chhattisgarh">छत्तीसगढ़ दरें</Link>
        {" · "}
        <Link href="/rates/methodology">पद्धति</Link>
        {" · "}
        <Link href="/rates/chhattisgarh/dataset">डेटासेट</Link>
      </p>

      <h2>ईंधन (शहर)</h2>
      <ul>
        {FUEL_CITY_SLUGS.map((city) => (
          <li key={city}>
            <Link href={`/rates/chhattisgarh/${city}/petrol-price-today`}>
              {cityDisplay(city)} पेट्रोल
            </Link>
            {" · "}
            <Link href={`/rates/chhattisgarh/${city}/diesel-price-today`}>
              {cityDisplay(city)} डीजल
            </Link>
          </li>
        ))}
      </ul>

      <h2>बुलियन (संकेतात्मक)</h2>
      <ul>
        <li>
          <Link href="/rates/chhattisgarh/gold-price-today">
            {getCategoryMeta("gold_24k").labelHi}
          </Link>
        </li>
        <li>
          <Link href="/rates/chhattisgarh/gold-22k-price-today">
            {getCategoryMeta("gold_22k").labelHi}
          </Link>
        </li>
        <li>
          <Link href="/rates/chhattisgarh/silver-price-today">
            {getCategoryMeta("silver_999").labelHi}
          </Link>
        </li>
      </ul>
    </main>
  );
}
