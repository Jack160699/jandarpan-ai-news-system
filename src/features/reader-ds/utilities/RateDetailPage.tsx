import Link from "next/link";
import { getCategoryMeta, getRelatedSupportedLocations } from "@/lib/verified-rates";
import { getRateHistory } from "@/lib/verified-rates/service";
import {
  rateBreadcrumbs,
  rateDatasetJsonLd,
  ratePageMetadata,
  rateWebPageJsonLd,
} from "@/lib/verified-rates/seo";
import type { RateCategory } from "@/lib/verified-rates/types";
import { RateHistoryTable } from "@/features/reader-ds/utilities/RateHistoryTable";
import { RateDetailClient } from "@/features/reader-ds/utilities/RateDetailClient";
import { districtHrefForCity, isFuelCitySlug } from "@/lib/verified-rates/catalog";

export async function buildRateMetadata(opts: {
  category: RateCategory;
  citySlug?: string | null;
  path: string;
}) {
  const { isRatePathIndexable } = await import("@/lib/verified-rates/public-gate");
  const indexable = await isRatePathIndexable({
    path: opts.path,
    category: opts.category,
    citySlug: opts.citySlug,
  });
  return ratePageMetadata({ ...opts, noindex: !indexable });
}

export async function RateDetailPage(opts: {
  category: RateCategory;
  citySlug?: string | null;
  path: string;
}) {
  const meta = getCategoryMeta(opts.category);
  const history = await getRateHistory({
    category: opts.category,
    citySlug: opts.citySlug,
    range: "MAX",
    language: "hi",
  });

  if ("error" in history) {
    return (
      <main style={{ maxWidth: 720, margin: "0 auto", padding: 16 }}>
        <h1>पृष्ठ उपलब्ध नहीं</h1>
        <p>यह शहर/श्रेणी संयोजन समर्थित नहीं है।</p>
        <Link href="/rates">दरें हब</Link>
      </main>
    );
  }

  const title =
    meta.group === "fuel"
      ? `${history.location.city} ${meta.labelHi} की कीमत आज`
      : `छत्तीसगढ़ ${meta.labelHi} कीमत आज`;

  const description =
    meta.group === "fuel"
      ? `आज ${history.location.city} में ${meta.labelHi} की सत्यापित कीमत और इतिहास।`
      : `छत्तीसगढ़/भारत संकेतात्मक ${meta.labelHi} बेंचमार्क और उपलब्ध इतिहास।`;

  const crumbs = rateBreadcrumbs(opts);
  const webpage = rateWebPageJsonLd({ title, description, path: opts.path });
  const dataset = rateDatasetJsonLd({
    name: `${title} — सत्यापित श्रृंखला`,
    description,
    path: opts.path,
    availableFrom: history.availableFrom,
    availableTo: history.availableTo,
    variable: meta.labelEn,
    unit: meta.unit,
    distributionUrl:
      history.points.length >= 7
        ? `/api/utilities/verified-rates/dataset?category=${opts.category}${
            opts.citySlug ? `&city=${opts.citySlug}` : ""
          }`
        : null,
    eligible: history.points.length >= 7,
  });

  const related = getRelatedSupportedLocations(opts.category);
  const currentMsg = currentStatusMessage(history.current.status, history.points.length);

  return (
    <main
      data-jd-rate-page={opts.category}
      style={{ maxWidth: 800, margin: "0 auto", padding: "20px 16px 48px", lineHeight: 1.55 }}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webpage) }}
      />
      {dataset ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(dataset) }}
        />
      ) : null}

      <nav aria-label="ब्रेडक्रम्ब" style={{ fontSize: 14, marginBottom: 12 }}>
        <Link href="/">होम</Link>
        {" · "}
        <Link href="/rates">दरें</Link>
        {" · "}
        <Link href="/rates/chhattisgarh">छत्तीसगढ़</Link>
      </nav>

      <h1 style={{ fontSize: "clamp(1.4rem, 3vw, 2rem)", margin: "0 0 8px" }}>{title}</h1>
      <p style={{ marginTop: 0, color: "var(--jd-ink-2, #444)" }}>{description}</p>
      <p style={{ fontSize: 14 }}>{history.location.honestyLabel}</p>

      <section
        aria-labelledby="current-rate"
        style={{
          margin: "20px 0",
          padding: 16,
          border: "1px solid var(--jd-line-2, #ddd)",
        }}
      >
        <h2 id="current-rate" style={{ fontSize: "1.1rem", marginTop: 0 }}>
          वर्तमान सत्यापित स्थिति
        </h2>
        {history.current.price && history.current.status !== "unavailable" ? (
          <p style={{ fontSize: "1.6rem", margin: "8px 0", fontWeight: 700 }}>
            ₹{history.current.price}{" "}
            <span style={{ fontSize: "1rem", fontWeight: 400 }}>{meta.unitLabelHi}</span>
          </p>
        ) : (
          <p style={{ fontWeight: 600 }}>{currentMsg}</p>
        )}
        {history.current.effectiveDate ? (
          <p style={{ margin: "4px 0", fontSize: 14 }}>
            प्रभावी तिथि: <time dateTime={history.current.effectiveDate}>{history.current.effectiveDate}</time>
            {history.current.verifiedAt ? (
              <>
                {" · "}
                अपडेट: <time dateTime={history.current.verifiedAt}>{history.current.verifiedAt}</time>
              </>
            ) : null}
            {history.current.sourceCount != null ? (
              <> · सत्यापित स्रोत: {history.current.sourceCount}</>
            ) : null}
          </p>
        ) : null}
        {history.movement.status !== "insufficient_history" ? (
          <p style={{ fontSize: 14 }}>
            पिछला बदलाव:{" "}
            {history.movement.status === "up"
              ? "वृद्धि"
              : history.movement.status === "down"
                ? "गिरावट"
                : "अपरिवर्तित"}
            {history.movement.absolute ? ` ₹${history.movement.absolute}` : ""}
            {history.movement.percentage ? ` (${history.movement.percentage}%)` : ""}
          </p>
        ) : (
          <p style={{ fontSize: 14 }}>
            तुलना के लिए पर्याप्त सत्यापित इतिहास अभी उपलब्ध नहीं है — तीर/ट्रेंड नहीं दिखाए गए।
          </p>
        )}
        {(history.statistics.high || history.statistics.low) && (
          <p style={{ fontSize: 14 }}>
            अवधि उच्च: {history.statistics.high ? `₹${history.statistics.high}` : "—"} · निम्न:{" "}
            {history.statistics.low ? `₹${history.statistics.low}` : "—"} · बिंदु:{" "}
            {history.statistics.observationCount} · लापता दिन: {history.statistics.missingDayCount}
          </p>
        )}
      </section>

      <section aria-labelledby="rate-graph" style={{ margin: "24px 0" }}>
        <h2 id="rate-graph" style={{ fontSize: "1.1rem" }}>
          ऐतिहासिक ग्राफ
        </h2>
        <RateDetailClient
          initial={history}
          categoryLabel={meta.labelHi}
          unitLabel={meta.unitLabelHi}
          citySlug={opts.citySlug}
        />
      </section>

      <section aria-labelledby="rate-table" style={{ margin: "24px 0" }}>
        <h2 id="rate-table" style={{ fontSize: "1.1rem" }}>
          सत्यापित इतिहास तालिका
        </h2>
        <RateHistoryTable
          points={history.points}
          unitLabel={meta.unitLabelHi}
          caption={`${meta.labelHi} — उपलब्ध सत्यापित दैनिक बिंदु`}
        />
      </section>

      <section aria-labelledby="method" style={{ margin: "24px 0" }}>
        <h2 id="method" style={{ fontSize: "1.1rem" }}>
          पद्धति व अस्वीकरण
        </h2>
        <p>{history.disclaimerHi}</p>
        <p>
          <Link href="/rates/methodology">पूरी पद्धति पढ़ें</Link>
          {" · "}
          <Link href="/rates/chhattisgarh/dataset">डेटासेट</Link>
          {" · "}
          <Link href="/contact">सुधार / संपर्क</Link>
        </p>
      </section>

      <section aria-labelledby="related" style={{ margin: "24px 0" }}>
        <h2 id="related" style={{ fontSize: "1.1rem" }}>
          संबंधित दरें व स्थान
        </h2>
        <ul>
          {related.map((r) => (
            <li key={r.path}>
              <Link href={r.path}>{r.labelHi}</Link>
            </li>
          ))}
          {opts.citySlug && isFuelCitySlug(opts.citySlug) ? (
            <li>
              <Link href={districtHrefForCity(opts.citySlug)}>जिला समाचार</Link>
            </li>
          ) : (
            <li>
              <Link href="/category/business">व्यापार समाचार</Link>
            </li>
          )}
          <li>
            <Link href="/rates/chhattisgarh">छत्तीसगढ़ दरें हब</Link>
          </li>
        </ul>
      </section>
    </main>
  );
}

function currentStatusMessage(
  status: string,
  pointCount: number
): string {
  if (status === "conflict") {
    return "आज अलग-अलग स्रोतों में पर्याप्त समानता नहीं मिली।";
  }
  if (status === "blocked") {
    return "आज की दर फिलहाल सत्यापित नहीं हो सकी। लाइसेंसशुदा स्रोत सक्रिय नहीं है।";
  }
  if (status === "stale") {
    return "आज की नई दर अभी सत्यापित नहीं हुई — नीचे पिछली सत्यापित तिथियाँ मूल तारीख के साथ उपलब्ध हैं।";
  }
  if (pointCount === 0) {
    return "आज की दर फिलहाल सत्यापित नहीं हो सकी।";
  }
  if (pointCount === 1) {
    return "ऐतिहासिक ग्राफ के लिए सत्यापित दैनिक डेटा एकत्र किया जा रहा है।";
  }
  return "आज की दर फिलहाल सत्यापित नहीं हो सकी।";
}
