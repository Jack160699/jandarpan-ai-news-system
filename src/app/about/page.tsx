import Link from "next/link";
import { JsonLdScript } from "@/components/seo/JsonLdScript";
import { PageShell } from "@/components/layout/PageShell";
import { organizationJsonLdFromSettings } from "@/lib/organization/json-ld";
import { fetchOrganizationSettings } from "@/lib/organization/settings";
import { buildLegalPageMetadata } from "@/lib/legal/page-metadata";
import { webPageJsonLd } from "@/lib/seo/json-ld";
import { getTenantConfig } from "@/lib/tenant/resolve";
import { CANONICAL_IDENTITY } from "@/lib/compliance/canonical-identity";

const MISSION =
  "Independent, factual, and hyperlocal journalism for Chhattisgarh and India — powered by district bureaus and verified newsroom standards.";

export async function generateMetadata() {
  const org = await fetchOrganizationSettings();
  return buildLegalPageMetadata({
    title: `About ${org.organizationName} · Publisher & Corporate Disclosure`,
    description: `About ${org.organizationName}, digital news publication operated by STRATXCEL SOLUTIONS (OPC) PRIVATE LIMITED. CIN: ${CANONICAL_IDENTITY.legalEntity.cin}. Editorial accountability and statutory disclosure.`,
    path: "/about",
  });
}

export default async function AboutPage() {
  const [org, tenant] = await Promise.all([
    fetchOrganizationSettings(),
    getTenantConfig(),
  ]);

  const orgJsonLd = organizationJsonLdFromSettings(org, tenant);
  const pageJsonLd = webPageJsonLd(
    `About ${org.organizationName}`,
    MISSION,
    "/about"
  );

  return (
    <PageShell pageTitle={`About ${org.organizationName}`}>
      <JsonLdScript data={[orgJsonLd, pageJsonLd]} />
      <main
        id="main-content"
        className="nr-root pl-container mx-auto max-w-3xl py-8 pb-24 px-4 text-stone-800 dark:text-stone-200"
      >
        <nav aria-label="Breadcrumb" className="mb-6 text-xs text-stone-500">
          <Link href="/" className="hover:underline text-[var(--jd-red)] font-semibold">
            Home
          </Link>
          <span className="mx-2 text-stone-400">/</span>
          <span className="text-stone-700 dark:text-stone-300 font-medium">About</span>
        </nav>

        <header className="border-b border-stone-200 dark:border-stone-800 pb-6 mb-8">
          <span className="inline-block rounded-full bg-red-100 dark:bg-red-950/60 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[var(--jd-red)] dark:text-red-400 mb-3">
            Institutional & Corporate Disclosure
          </span>
          <h1 className="m-0 jd-serif text-3xl md:text-4xl font-extrabold tracking-tight text-stone-900 dark:text-stone-50">
            About {CANONICAL_IDENTITY.publication.name}
          </h1>
          <p className="mt-2 text-base text-stone-600 dark:text-stone-400 leading-relaxed">
            {CANONICAL_IDENTITY.publication.description}
          </p>
        </header>

        {/* Legal Publisher & Entity Card */}
        <section aria-labelledby="publisher-disclosure" className="mb-10 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-900/60 p-6">
          <h2 id="publisher-disclosure" className="m-0 text-lg font-bold text-stone-900 dark:text-stone-100 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[var(--jd-red)] inline-block"></span>
            Ownership & Legal Publisher Disclosure
          </h2>
          <p className="text-sm leading-relaxed text-stone-600 dark:text-stone-300 mb-4">
            <strong>{CANONICAL_IDENTITY.publication.name}</strong> is a digital news and current-affairs publication operated and published by:
          </p>

          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm bg-white dark:bg-stone-950 p-4 rounded-lg border border-stone-200/70 dark:border-stone-800">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">Legal Operating Entity</dt>
              <dd className="font-bold text-stone-900 dark:text-stone-100 mt-1">{CANONICAL_IDENTITY.legalEntity.legalName}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">Corporate Identity Number (CIN)</dt>
              <dd className="font-mono font-medium text-stone-900 dark:text-stone-100 mt-1">{CANONICAL_IDENTITY.legalEntity.cin}</dd>
            </div>
            <div className="md:col-span-2">
              <dt className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">Registered Office Address</dt>
              <dd className="text-stone-800 dark:text-stone-200 mt-1">
                {CANONICAL_IDENTITY.legalEntity.registeredOffice.formatted}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">Founder & Director</dt>
              <dd className="font-semibold text-stone-900 dark:text-stone-100 mt-1">{CANONICAL_IDENTITY.leadership.founderAndDirector}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">Editorial & Publication Accountability</dt>
              <dd className="font-semibold text-stone-900 dark:text-stone-100 mt-1">{CANONICAL_IDENTITY.leadership.editorialAccountability}</dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-stone-500 dark:text-stone-400 italic">
            * Jan Darpan is the proprietary digital news brand of STRATXCEL SOLUTIONS (OPC) PRIVATE LIMITED. No fictitious subsidiary or separate entity is claimed.
          </p>
        </section>

        {/* Editorial Standards & Mission */}
        <section className="space-y-8 mb-12">
          <div>
            <h2 className="m-0 text-xl font-bold text-stone-900 dark:text-stone-100">
              Our Mission & Coverage Scope
            </h2>
            <p className="mt-2 text-[15px] leading-relaxed text-stone-700 dark:text-stone-300">
              {MISSION} Jan Darpan was established to serve the citizen information needs of Chhattisgarh across all districts — from Bastar to Surguja, Raipur to Bilaspur — alongside essential national developments. We report in Hindi and English with authentic district bureau inputs, direct ground sources, and verifiable government public records.
            </p>
          </div>

          <div>
            <h2 className="m-0 text-xl font-bold text-stone-900 dark:text-stone-100">
              AI-Assisted Newsroom Policy
            </h2>
            <p className="mt-2 text-[15px] leading-relaxed text-stone-700 dark:text-stone-300">
              Jan Darpan utilizes structured AI systems exclusively for editorial assistance: ingestion filtering, regional classification, taxonomy clustering, and draft summarization. Under our strict newsroom architecture:
            </p>
            <ul className="mt-3 list-disc pl-5 space-y-1.5 text-sm text-stone-600 dark:text-stone-300">
              <li>AI systems are strictly barred from fabricating facts, quotes, statistics, or sources.</li>
              <li>Only authentic, verified story-specific media and public wire photographs are approved for publication. Synthetic visual placeholders are completely prohibited.</li>
              <li>Human editors retain exclusive, authoritative sign-off on breaking news, investigative reporting, and public dissemination.</li>
            </ul>
          </div>

          <div>
            <h2 className="m-0 text-xl font-bold text-stone-900 dark:text-stone-100">
              Grievance Redressal & Statutory Accountability
            </h2>
            <p className="mt-2 text-[15px] leading-relaxed text-stone-700 dark:text-stone-300">
              In accordance with Part III of the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021 (updated through 2026), Jan Darpan maintains a dedicated Level-I Grievance Redressal Mechanism headed by a designated Grievance Officer.
            </p>
            <div className="mt-4 p-4 rounded-lg border border-red-200 dark:border-red-950/60 bg-red-50/50 dark:bg-red-950/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <p className="font-bold text-stone-900 dark:text-stone-100 text-sm">Grievance Officer: {CANONICAL_IDENTITY.grievanceOfficer.name}</p>
                <p className="text-xs text-stone-600 dark:text-stone-400 mt-0.5">24-hour acknowledgement SLA · 15-day resolution SLA</p>
              </div>
              <Link
                href="/grievance-redressal"
                className="inline-flex items-center px-4 py-2 text-xs font-bold rounded-lg text-white bg-[var(--jd-red)] hover:bg-[#851428] transition-colors shrink-0"
              >
                Grievance Redressal Portal →
              </Link>
            </div>
          </div>

          <div>
            <h2 className="m-0 text-xl font-bold text-stone-900 dark:text-stone-100">
              Institutional Standards & Policies
            </h2>
            <p className="mt-2 text-[15px] leading-relaxed text-stone-700 dark:text-stone-300 mb-4">
              Readers, sources, and regulatory authorities can inspect our published policies and monthly compliance disclosures:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <Link href="/grievance-redressal" className="p-3 rounded-lg border border-stone-200 dark:border-stone-800 hover:border-red-400 transition-colors bg-white dark:bg-stone-900">
                <span className="font-semibold block text-stone-900 dark:text-stone-100">Grievance Redressal</span>
                <span className="text-xs text-stone-500">Statutory Rule 11 grievance redressal mechanism</span>
              </Link>
              <Link href="/compliance" className="p-3 rounded-lg border border-stone-200 dark:border-stone-800 hover:border-red-400 transition-colors bg-white dark:bg-stone-900">
                <span className="font-semibold block text-stone-900 dark:text-stone-100">Monthly Compliance Reports</span>
                <span className="text-xs text-stone-500">Public monthly grievance disclosure & records</span>
              </Link>
              <Link href="/editorial-policy" className="p-3 rounded-lg border border-stone-200 dark:border-stone-800 hover:border-red-400 transition-colors bg-white dark:bg-stone-900">
                <span className="font-semibold block text-stone-900 dark:text-stone-100">Editorial Policy & Code of Ethics</span>
                <span className="text-xs text-stone-500">Journalistic standards, verification, and AI policy</span>
              </Link>
              <Link href="/corrections" className="p-3 rounded-lg border border-stone-200 dark:border-stone-800 hover:border-red-400 transition-colors bg-white dark:bg-stone-900">
                <span className="font-semibold block text-stone-900 dark:text-stone-100">Corrections Policy</span>
                <span className="text-xs text-stone-500">Factual error handling, versioning & review</span>
              </Link>
              <Link href="/copyright-content-removal" className="p-3 rounded-lg border border-stone-200 dark:border-stone-800 hover:border-red-400 transition-colors bg-white dark:bg-stone-900">
                <span className="font-semibold block text-stone-900 dark:text-stone-100">Copyright & Content Removal</span>
                <span className="text-xs text-stone-500">Fair use, rights verification & takedown procedure</span>
              </Link>
              <Link href="/contact" className="p-3 rounded-lg border border-stone-200 dark:border-stone-800 hover:border-red-400 transition-colors bg-white dark:bg-stone-900">
                <span className="font-semibold block text-stone-900 dark:text-stone-100">Contact Newsroom</span>
                <span className="text-xs text-stone-500">Bureaus, press inquiries, and WhatsApp contacts</span>
              </Link>
            </div>
          </div>
        </section>
      </main>
    </PageShell>
  );
}
