import Link from "next/link";
import { PageShell } from "@/components/layout/PageShell";
import { buildLegalPageMetadata } from "@/lib/legal/page-metadata";
import { CANONICAL_IDENTITY } from "@/lib/compliance/canonical-identity";
import { GrievanceForm } from "@/components/compliance/GrievanceForm";

export async function generateMetadata() {
  return buildLegalPageMetadata({
    title: "Grievance Redressal Mechanism · Rule 11 Statutory Officer",
    description: `Statutory Level-I Grievance Redressal Mechanism for Jan Darpan under Part III of the IT Rules. Grievance Officer: ${CANONICAL_IDENTITY.grievanceOfficer.name}. WhatsApp: ${CANONICAL_IDENTITY.grievanceOfficer.primaryPhone}. 24h acknowledgement, 15-day resolution SLA.`,
    path: "/grievance-redressal",
  });
}

export default function GrievanceRedressalPage() {
  const go = CANONICAL_IDENTITY.grievanceOfficer;
  const entity = CANONICAL_IDENTITY.legalEntity;

  return (
    <PageShell pageTitle="Grievance Redressal Mechanism · Jan Darpan">
      <main
        id="main-content"
        className="nr-root pl-container mx-auto max-w-3xl py-8 pb-24 px-4 text-stone-800 dark:text-stone-200"
      >
        <nav aria-label="Breadcrumb" className="mb-6 text-xs text-stone-500">
          <Link href="/" className="hover:underline text-[var(--jd-red)] font-semibold">
            Home
          </Link>
          <span className="mx-2 text-stone-400">/</span>
          <span className="text-stone-700 dark:text-stone-300 font-medium">Grievance Redressal</span>
        </nav>

        <header className="border-b border-stone-200 dark:border-stone-800 pb-6 mb-8">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="inline-block rounded-full bg-red-100 dark:bg-red-950/60 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[var(--jd-red)] dark:text-red-400">
              Rule 11 · Level-I Grievance Redressal Mechanism
            </span>
            <span className="inline-block rounded-full bg-stone-100 dark:bg-stone-800 px-3 py-1 text-xs font-medium text-stone-600 dark:text-stone-300">
              IT Rules (Part III), MIB Updated
            </span>
          </div>

          <h1 className="m-0 jd-serif text-3xl md:text-4xl font-extrabold tracking-tight text-stone-900 dark:text-stone-50">
            Grievance Redressal Mechanism
          </h1>
          <p className="mt-2 text-base text-stone-600 dark:text-stone-400 leading-relaxed">
            Statutory redressal of grievances relating to content, Code of Ethics compliance, and factual integrity published on {CANONICAL_IDENTITY.publication.name}.
          </p>
        </header>

        {/* Statutory Grievance Officer Particulars */}
        <section aria-labelledby="officer-card" className="mb-10 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50/50 dark:bg-red-950/20 p-6">
          <h2 id="officer-card" className="m-0 text-lg font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--jd-red)]"></span>
            Designated Grievance Officer (Level-I)
          </h2>
          <p className="text-xs text-stone-600 dark:text-stone-400 mt-1 mb-4">
            Under Rule 11(2)(a) of the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021.
          </p>

          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm bg-white dark:bg-stone-950 p-5 rounded-lg border border-red-100 dark:border-red-950">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">Grievance Officer Name</dt>
              <dd className="font-bold text-stone-900 dark:text-stone-100 text-base mt-1">{go.name}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">Designation</dt>
              <dd className="font-semibold text-stone-800 dark:text-stone-200 mt-1">{go.designation}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">Statutory Grievance Email</dt>
              <dd className="mt-1">
                <a href={`mailto:${go.email}`} className="font-bold text-[var(--jd-red)] hover:underline">
                  {go.email}
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">Primary Grievance Phone / WhatsApp</dt>
              <dd className="mt-1">
                <a href={`https://wa.me/${go.primaryWhatsAppClean}`} className="font-bold text-stone-900 dark:text-stone-100 hover:underline">
                  {go.primaryPhone}
                </a>
                <span className="block text-[11px] text-stone-500">Personal contact of the statutory officer</span>
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">Legal Publisher / Registered Office</dt>
              <dd className="text-stone-800 dark:text-stone-200 mt-1">
                <strong>{entity.legalName}</strong> (CIN: {entity.cin})
                <br />
                {entity.registeredOffice.formatted}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">Additional Jan Darpan / Business WhatsApp</dt>
              <dd className="text-stone-700 dark:text-stone-300 mt-1">
                {CANONICAL_IDENTITY.businessAndGeneral.additionalWhatsApp} (Business & general editorial desk contact)
              </dd>
            </div>
          </dl>
        </section>

        {/* WhatsApp Grievance Intake Channel (Highlighted) */}
        <section aria-labelledby="whatsapp-intake" className="mb-10 rounded-xl border border-green-200 dark:border-green-900/60 bg-green-50/70 dark:bg-green-950/20 p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider bg-green-600 text-white px-2 py-0.5 rounded">
                  Fastest Intake
                </span>
                <h2 id="whatsapp-intake" className="m-0 text-base font-bold text-stone-900 dark:text-stone-100">
                  Register Grievance via WhatsApp
                </h2>
              </div>
              <p className="text-sm text-stone-700 dark:text-stone-300 font-medium mt-1">
                For the fastest grievance registration, send your grievance as a WhatsApp message to {go.primaryWhatsApp}.
              </p>
              <p className="text-xs text-stone-600 dark:text-stone-400 mt-1">
                Messages to this channel are logged directly into our statutory compliance queue and acknowledged within 24 hours with an official reference ID.
              </p>
            </div>

            <a
              id="whatsapp-grievance-cta"
              href={`https://wa.me/${go.primaryWhatsAppClean}?text=Namaste%20Grievance%20Officer,%20I%20wish%20to%20register%20a%20formal%20grievance%20under%20IT%20Rules%20regarding%20content%20on%20Jan%20Darpan.`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg text-white font-bold text-sm bg-green-600 hover:bg-green-700 transition-colors shrink-0 shadow-sm"
            >
              <span>Send Grievance on WhatsApp</span>
              <span>→</span>
            </a>
          </div>
        </section>

        {/* Timelines and 15-Day SLA Clock */}
        <section className="mb-10 space-y-4" aria-labelledby="sla-commitments">
          <h2 id="sla-commitments" className="m-0 text-xl font-bold text-stone-900 dark:text-stone-100">
            Statutory Timelines & Redressal Process
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900">
              <span className="font-mono text-2xl font-extrabold text-[var(--jd-red)] block">24 Hours</span>
              <h3 className="m-0 font-bold text-stone-900 dark:text-stone-100 mt-1">Acknowledgment</h3>
              <p className="text-xs text-stone-600 dark:text-stone-400 mt-1">
                Receipt is formally acknowledged within 24 hours and assigned a unique statutory reference number (JD-GR-YYYYMM-XXXX).
              </p>
            </div>

            <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900">
              <span className="font-mono text-2xl font-extrabold text-[var(--jd-red)] block">15 Days</span>
              <h3 className="m-0 font-bold text-stone-900 dark:text-stone-100 mt-1">Publisher Decision</h3>
              <p className="text-xs text-stone-600 dark:text-stone-400 mt-1">
                The Grievance Officer investigates the complaint, verifies newsroom records, decides the matter, and communicates the decision in writing within 15 calendar days.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900">
              <span className="font-mono text-2xl font-extrabold text-stone-700 dark:text-stone-300 block">Tiered</span>
              <h3 className="m-0 font-bold text-stone-900 dark:text-stone-100 mt-1">Escalation Rights</h3>
              <p className="text-xs text-stone-600 dark:text-stone-400 mt-1">
                If not satisfied or if unresolved within 15 days, complainants may escalate to the Level-II Self-Regulating Body or Level-III Government mechanism.
              </p>
            </div>
          </div>
        </section>

        {/* Three-Tier Grievance Architecture */}
        <section className="mb-10 p-5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/50" aria-labelledby="three-tier-structure">
          <h2 id="three-tier-structure" className="m-0 text-base font-bold text-stone-900 dark:text-stone-100 mb-3">
            Three-Tier Redressal Mechanism (IT Rules, 2021)
          </h2>
          <div className="space-y-3 text-sm">
            <div className="p-3 rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800">
              <p className="font-bold text-stone-900 dark:text-stone-100">
                LEVEL I: Publisher Redressal (Jan Darpan)
              </p>
              <p className="text-xs text-stone-600 dark:text-stone-400 mt-0.5">
                Handled by designated Grievance Officer Shriyansh Chandrakar. Initial point of contact. Statutory resolution SLA: 15 calendar days.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800">
              <p className="font-bold text-stone-900 dark:text-stone-100 flex items-center justify-between">
                <span>LEVEL II: Self-Regulating Body (SRB)</span>
                <span className="text-[10px] font-mono font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 px-2 py-0.5 rounded">
                  {CANONICAL_IDENTITY.srb.status}
                </span>
              </p>
              <p className="text-xs text-stone-600 dark:text-stone-400 mt-0.5">
                {CANONICAL_IDENTITY.srb.disclaimer}
              </p>
            </div>

            <div className="p-3 rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800">
              <p className="font-bold text-stone-900 dark:text-stone-100">
                LEVEL III: Oversight Mechanism (Central Government)
              </p>
              <p className="text-xs text-stone-600 dark:text-stone-400 mt-0.5">
                Inter-Departmental Committee established by the Ministry of Information & Broadcasting, Government of India.
              </p>
            </div>
          </div>
        </section>

        {/* Structured Web Grievance Submission Form */}
        <section className="mb-12" aria-labelledby="web-grievance-form">
          <div className="border-t border-stone-200 dark:border-stone-800 pt-8 mb-6">
            <h2 id="web-grievance-form" className="m-0 text-xl font-bold text-stone-900 dark:text-stone-100">
              Online Grievance Submission Form (Level-I)
            </h2>
            <p className="text-xs text-stone-600 dark:text-stone-400 mt-1">
              Submit your formal grievance below. Every submission is recorded in our compliance register and generates an official reference ID.
            </p>
          </div>
          <GrievanceForm />
        </section>

        {/* Public Disclosures Link */}
        <section className="border-t border-stone-200 dark:border-stone-800 pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-stone-500">
          <p>
            Jan Darpan publishes aggregate monthly compliance and grievance statistics under Rule 19.
          </p>
          <Link
            href="/compliance"
            className="font-bold text-[var(--jd-red)] hover:underline shrink-0"
          >
            View Monthly Compliance Disclosures →
          </Link>
        </section>
      </main>
    </PageShell>
  );
}
