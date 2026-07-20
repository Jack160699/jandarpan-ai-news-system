import Link from "next/link";
import { JsonLdScript } from "@/components/seo/JsonLdScript";
import { PageShell } from "@/components/layout/PageShell";
import { buildLegalPageMetadata } from "@/lib/legal/page-metadata";
import { janDarpanNewsDeskAuthor, webPageJsonLd } from "@/lib/seo/json-ld";
import { SITE_NAME } from "@/lib/seo/constants";

const SUMMARY =
  "How Jan Darpan drafts, gates, and publishes Chhattisgarh district news — including AI-assisted drafting and quality controls.";

export async function generateMetadata() {
  return buildLegalPageMetadata({
    title: `How we report — ${SITE_NAME}`,
    description: SUMMARY,
    path: "/how-we-report",
  });
}

export default function HowWeReportPage() {
  const pageJsonLd = webPageJsonLd("How we report", SUMMARY, "/how-we-report");
  const desk = janDarpanNewsDeskAuthor();

  return (
    <PageShell>
      <JsonLdScript data={[pageJsonLd, desk]} />
      <main
        id="main-content"
        className="nr-root pl-container mx-auto max-w-2xl py-8 pb-24"
      >
        <Link
          href="/"
          className="mb-6 inline-flex text-sm font-semibold text-[#a01830] no-underline dark:text-red-400"
        >
          ← Back
        </Link>
        <h1 className="m-0 font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-50">
          How we report
        </h1>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          Editorial methodology · {SITE_NAME}
        </p>

        <section className="mt-8 space-y-6">
          <div>
            <h2 className="m-0 text-base font-bold text-stone-800 dark:text-stone-100">
              What this page is
            </h2>
            <p className="mt-2 text-[15px] leading-relaxed text-stone-600 dark:text-stone-300">
              This page explains how stories move from public signals and licensed
              sources into published district coverage. It is intentionally
              factual — we do not claim human review on every article.
            </p>
          </div>

          <div>
            <h2 className="m-0 text-base font-bold text-stone-800 dark:text-stone-100">
              AI-assisted drafting
            </h2>
            <p className="mt-2 text-[15px] leading-relaxed text-stone-600 dark:text-stone-300">
              Many articles are drafted with AI assistance from ingested news
              signals (RSS, APIs, and partner feeds). Models help structure
              headlines, summaries, and body copy in Hindi and English. AI does
              not invent eyewitness reporting; drafts are grounded in source
              material when available.
            </p>
          </div>

          <div>
            <h2 className="m-0 text-base font-bold text-stone-800 dark:text-stone-100">
              Quality gates
            </h2>
            <p className="mt-2 text-[15px] leading-relaxed text-stone-600 dark:text-stone-300">
              Before publish, automated gates check for minimum quality signals:
              factual grounding against source URLs where recorded, district
              relevance, readability, image presence, and headline clarity.
              Unsupported claims can be stripped via an evidence ledger. Stories
              that fail thresholds are held or discarded — they are not forced
              live.
            </p>
          </div>

          <div>
            <h2 className="m-0 text-base font-bold text-stone-800 dark:text-stone-100">
              What we do not claim
            </h2>
            <p className="mt-2 text-[15px] leading-relaxed text-stone-600 dark:text-stone-300">
              We do not claim that every published story was manually edited by a
              human reporter. Desk oversight and tooling evolve over time; when
              human review applies to a specific story, that should be stated on
              the story itself — not implied by this page.
            </p>
          </div>

          <div>
            <h2 className="m-0 text-base font-bold text-stone-800 dark:text-stone-100">
              Corrections
            </h2>
            <p className="mt-2 text-[15px] leading-relaxed text-stone-600 dark:text-stone-300">
              If you spot an error, contact the news desk via the channels listed
              on our{" "}
              <Link href="/about" className="font-semibold text-[#a01830] dark:text-red-400">
                About
              </Link>{" "}
              page. Material corrections are updated on the story with a visible
              note when practical.
            </p>
          </div>
        </section>
      </main>
    </PageShell>
  );
}
