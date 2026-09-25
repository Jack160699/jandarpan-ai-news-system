import Link from "next/link";
import { JsonLdScript } from "@/components/seo/JsonLdScript";
import { PageShell } from "@/components/layout/PageShell";
import { LegalPolicyContent } from "@/components/legal/LegalPolicyContent";
import { webPageJsonLd } from "@/lib/seo/json-ld";
import type { PolicyDocument } from "@/lib/legal/policies";
import { CANONICAL_IDENTITY } from "@/lib/compliance/canonical-identity";

type FoundationLegalPageProps = {
  doc: PolicyDocument;
};

export function FoundationLegalPage({ doc }: FoundationLegalPageProps) {
  const description = doc.sections[0]?.body ?? doc.titleEn;
  const jsonLd = webPageJsonLd(doc.titleEn, description, doc.path);

  return (
    <PageShell pageTitle={doc.titleEn}>
      <JsonLdScript data={jsonLd} />
      <main
        id="main-content"
        className="nr-root pl-container mx-auto max-w-3xl py-8 pb-24 px-4 text-stone-800 dark:text-stone-200"
      >
        <nav aria-label="Breadcrumb" className="mb-6 text-xs text-stone-500">
          <Link href="/" className="hover:underline text-[var(--jd-red)] font-semibold">
            Home
          </Link>
          <span className="mx-2 text-stone-400">/</span>
          <span className="text-stone-700 dark:text-stone-300 font-medium">{doc.titleEn}</span>
        </nav>
        <h1 className="m-0 jd-serif text-3xl font-extrabold tracking-tight text-stone-900 dark:text-stone-50">
          {doc.titleEn}
        </h1>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          Last updated {doc.updated} · Jan Darpan News Network
        </p>

        <LegalPolicyContent doc={doc} variant="page" />

        {/* Operational Redressal Callout Box */}
        <div className="mt-10 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-900/60 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[var(--jd-red)]"></span>
            <h3 className="m-0 text-sm font-bold text-stone-900 dark:text-stone-100">
              {doc.path === "/corrections"
                ? "Submit an Official Factual Correction"
                : doc.path === "/copyright-content-removal"
                ? "Submit Copyright or Content Takedown Notice"
                : "Editorial Grievance & Standards Portal"}
            </h3>
          </div>
          <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
            All requests are processed under our Level-I Statutory Grievance Redressal Mechanism under Rule 11 of the IT Rules. Every submission is recorded with an official tracking ID, acknowledged within 24 hours, and resolved within 15 calendar days.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Link
              href="/grievance-redressal"
              className="inline-flex items-center text-xs font-bold text-white bg-[var(--jd-red)] hover:bg-[#851428] px-3.5 py-2 rounded-lg transition-colors"
            >
              Open Grievance Redressal Form →
            </Link>
            <a
              href={`https://wa.me/${CANONICAL_IDENTITY.grievanceOfficer.primaryWhatsAppClean}?text=Namaste%20Grievance%20Officer,%20I%20wish%20to%20submit%20a%20${doc.slug}%20request.`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-xs font-semibold text-green-700 dark:text-green-300 hover:underline"
            >
              Send directly on WhatsApp (+91 95847 35857) ↗
            </a>
          </div>
        </div>
      </main>
    </PageShell>
  );
}
