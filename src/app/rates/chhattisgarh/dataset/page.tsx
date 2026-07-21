import Link from "next/link";
import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { getDatasetMetadata } from "@/lib/verified-rates/service";
import { FUEL_CITY_SLUGS, cityDisplay } from "@/lib/verified-rates/catalog";
import { rateDatasetJsonLd } from "@/lib/verified-rates/seo";
import { webPageJsonLd } from "@/lib/seo/json-ld";

export async function generateMetadata(): Promise<Metadata> {
  const samples = await Promise.all([
    getDatasetMetadata({ category: "petrol", citySlug: "raipur" }),
    getDatasetMetadata({ category: "gold_24k", citySlug: null }),
  ]);
  const anyEligible = samples.some((s) => s.datasetExportEligible);
  return buildPageMetadata({
    title: anyEligible
      ? "सत्यापित दर डेटासेट — छत्तीसगढ़ | जन दर्पण"
      : "सत्यापित दर डेटासेट — सत्यापन के बाद उपलब्ध | जन दर्पण",
    description:
      "जन दर्पण सत्यापित दर श्रृंखला का उद्धरण-योग्य विवरण — कवरेज, आवृत्ति, पद्धति और सुरक्षित निर्यात। बैकलिंक की गारंटी नहीं। काल्पनिक भाव नहीं।",
    path: "/rates/chhattisgarh/dataset",
    locale: "hi_IN",
    section: "rates",
    noindex: !anyEligible,
  });
}

export default async function RatesDatasetPage() {
  const samples = await Promise.all([
    getDatasetMetadata({ category: "petrol", citySlug: "raipur" }),
    getDatasetMetadata({ category: "gold_24k", citySlug: null }),
  ]);

  const anyEligible = samples.some((s) => s.datasetExportEligible);
  const datasetLd = rateDatasetJsonLd({
    name: "जन दर्पण सत्यापित दर श्रृंखला",
    description: "छत्तीसगढ़ ईंधन और संकेतात्मक बुलियन सत्यापित दैनिक बिंदु",
    path: "/rates/chhattisgarh/dataset",
    availableFrom: samples[0]?.firstAvailableDate ?? samples[1]?.firstAvailableDate ?? null,
    availableTo: samples[0]?.latestAvailableDate ?? samples[1]?.latestAvailableDate ?? null,
    variable: "Verified retail/benchmark price",
    unit: "INR",
    distributionUrl: anyEligible
      ? "/api/utilities/verified-rates/dataset?category=petrol&city=raipur"
      : null,
    eligible: anyEligible,
  });

  const pageLd = webPageJsonLd(
    "सत्यापित दर डेटासेट",
    "उद्धरण-योग्य ऐतिहासिक श्रृंखला विवरण",
    "/rates/chhattisgarh/dataset"
  );

  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: 16, lineHeight: 1.6 }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(pageLd) }}
      />
      {datasetLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(datasetLd) }}
        />
      ) : null}

      <h1>सत्यापित दर डेटासेट</h1>
      <p>
        यह पृष्ठ उद्धरण के लिए श्रृंखला मेटाडेटा देता है। खाली CSV उपयोगी डेटासेट नहीं माना
        जाता — पर्याप्त इतिहास होने पर ही निर्यात खुलता है। बैकलिंक/रैंकिंग की गारंटी नहीं।
      </p>

      <h2>कवरेज</h2>
      <ul>
        <li>ईंधन शहर: {FUEL_CITY_SLUGS.map((c) => cityDisplay(c)).join(", ")}</li>
        <li>बुलियन: छत्तीसगढ़/भारत संकेतात्मक (शहर-विशेष आधिकारिक MRP नहीं)</li>
      </ul>

      <h2>नमूना स्वास्थ्य</h2>
      <ul>
        {samples.map((s) => (
          <li key={`${s.category}-${s.labelHi}`}>
            {s.labelHi}: बिंदु {s.snapshotCount}
            {s.firstAvailableDate ? ` · ${s.firstAvailableDate} → ${s.latestAvailableDate}` : " · संग्रह जारी"}
            {s.datasetExportEligible ? (
              <>
                {" · "}
                <a
                  href={`/api/utilities/verified-rates/dataset?category=${s.category}${
                    s.category === "petrol" ? "&city=raipur" : ""
                  }`}
                >
                  CSV
                </a>
              </>
            ) : (
              " · CSV अभी नहीं"
            )}
          </li>
        ))}
      </ul>

      <h2>उद्धरण सुझाव</h2>
      <p>{samples[0]?.citationSuggestionHi}</p>

      <h2>सुधार नीति</h2>
      <p>
        <Link href="/contact">संपर्क</Link> · <Link href="/rates/methodology">पद्धति</Link>
      </p>
    </main>
  );
}
