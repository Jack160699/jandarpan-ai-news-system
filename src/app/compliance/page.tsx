import Link from "next/link";
import { PageShell } from "@/components/layout/PageShell";
import { buildLegalPageMetadata } from "@/lib/legal/page-metadata";
import { createAdminServerClient } from "@/lib/supabase/admin";
import { CANONICAL_IDENTITY } from "@/lib/compliance/canonical-identity";

export async function generateMetadata() {
  return buildLegalPageMetadata({
    title: "Monthly Compliance Disclosures · Rule 19 Statutory Transparency",
    description: `Public monthly compliance and grievance redressal disclosures for Jan Darpan under Rule 19 of the IT Rules, 2021. Published by STRATXCEL SOLUTIONS (OPC) PRIVATE LIMITED.`,
    path: "/compliance",
  });
}

import { isSupabaseConfigured } from "@/lib/supabase";

export default async function ComplianceArchivePage() {
  let publishedReports: any[] = [];

  if (isSupabaseConfigured()) {
    try {
      const supabase = createAdminServerClient();
      const { data: reports } = await (supabase as any)
        .from("compliance_reports")
        .select("month, period_start, period_end, status, published_at, metrics")
        .eq("status", "PUBLISHED")
        .order("month", { ascending: false });

      publishedReports = (reports ?? []) as any[];
    } catch (e) {
      console.warn("[compliance] fetch error:", e);
    }
  }

  return (
    <PageShell pageTitle="Monthly Compliance Disclosures · Jan Darpan">
      <main
        id="main-content"
        className="nr-root pl-container mx-auto max-w-3xl py-8 pb-24 px-4 text-stone-800 dark:text-stone-200"
      >
        <nav aria-label="Breadcrumb" className="mb-6 text-xs text-stone-500">
          <Link href="/" className="hover:underline text-[var(--jd-red)] font-semibold">
            Home
          </Link>
          <span className="mx-2 text-stone-400">/</span>
          <span className="text-stone-700 dark:text-stone-300 font-medium">Compliance Disclosures</span>
        </nav>

        <header className="border-b border-stone-200 dark:border-stone-800 pb-6 mb-8">
          <span className="inline-block rounded-full bg-red-100 dark:bg-red-950/60 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[var(--jd-red)] dark:text-red-400 mb-3">
            Rule 19 · Statutory Transparency
          </span>
          <h1 className="m-0 jd-serif text-3xl md:text-4xl font-extrabold tracking-tight text-stone-900 dark:text-stone-50">
            Monthly Compliance Reports
          </h1>
          <p className="mt-2 text-base text-stone-600 dark:text-stone-400 leading-relaxed">
            Statutory monthly disclosure of grievance redressal, action taken, and Code of Ethics adherence under Rule 19 of the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021.
          </p>
        </header>

        {/* Legal Publisher Entity Overview */}
        <section className="mb-8 p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/50 text-xs text-stone-600 dark:text-stone-400">
          <p>
            <strong>Publisher:</strong> {CANONICAL_IDENTITY.legalEntity.legalName} (CIN: {CANONICAL_IDENTITY.legalEntity.cin})
            <br />
            <strong>Registered Office:</strong> {CANONICAL_IDENTITY.legalEntity.registeredOffice.formatted}
            <br />
            <strong>Grievance Officer:</strong> {CANONICAL_IDENTITY.grievanceOfficer.name} · WhatsApp: {CANONICAL_IDENTITY.grievanceOfficer.primaryWhatsApp}
          </p>
        </section>

        {/* Monthly Archive List */}
        <section aria-labelledby="monthly-disclosures" className="mb-10">
          <h2 id="monthly-disclosures" className="m-0 text-xl font-bold text-stone-900 dark:text-stone-100 mb-4">
            Published Monthly Reports
          </h2>

          {publishedReports.length === 0 ? (
            <div className="p-8 text-center rounded-xl border border-dashed border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900">
              <p className="text-stone-600 dark:text-stone-400 text-sm">
                The compliance disclosure archive is currently active. The monthly report for the previous calendar month is undergoing human editorial validation prior to statutory publication.
              </p>
              <div className="mt-4">
                <Link
                  href="/grievance-redressal"
                  className="inline-flex text-xs font-bold text-[var(--jd-red)] hover:underline"
                >
                  View Grievance Redressal Mechanism & Officer Contact →
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {publishedReports.map((report) => {
                const [y, m] = report.month.split("-");
                const monthName = new Date(Date.UTC(parseInt(y, 10), parseInt(m, 10) - 1, 1)).toLocaleString("en-US", {
                  month: "long",
                  year: "numeric",
                  timeZone: "UTC",
                });
                const metrics = report.metrics || {};

                return (
                  <article
                    key={report.month}
                    className="p-5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 hover:border-red-300 dark:hover:border-red-900 transition-colors shadow-sm"
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-stone-100 dark:border-stone-800 pb-3 mb-3">
                      <div>
                        <h3 className="m-0 text-lg font-bold text-stone-900 dark:text-stone-100">
                          {monthName}
                        </h3>
                        <p className="text-xs text-stone-500">
                          Reporting Period: {report.period_start} to {report.period_end}
                        </p>
                      </div>
                      <span className="px-2.5 py-1 rounded text-[11px] font-bold uppercase bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300">
                        Published
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-4">
                      <div className="p-2.5 rounded bg-stone-50 dark:bg-stone-950">
                        <span className="text-stone-500 block">Received</span>
                        <span className="text-base font-extrabold text-stone-900 dark:text-stone-100">{metrics.grievancesReceived ?? 0}</span>
                      </div>
                      <div className="p-2.5 rounded bg-stone-50 dark:bg-stone-950">
                        <span className="text-stone-500 block">Acknowledged (&lt;24h)</span>
                        <span className="text-base font-extrabold text-stone-900 dark:text-stone-100">{metrics.grievancesAcknowledged ?? 0}</span>
                      </div>
                      <div className="p-2.5 rounded bg-stone-50 dark:bg-stone-950">
                        <span className="text-stone-500 block">Resolved (&lt;15d)</span>
                        <span className="text-base font-extrabold text-green-600 dark:text-green-400">{metrics.grievancesResolved ?? 0}</span>
                      </div>
                      <div className="p-2.5 rounded bg-stone-50 dark:bg-stone-950">
                        <span className="text-stone-500 block">Pending</span>
                        <span className="text-base font-extrabold text-stone-900 dark:text-stone-100">{metrics.grievancesPending ?? 0}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-stone-500">
                        Published on {new Date(report.published_at).toLocaleDateString()}
                      </span>
                      <Link
                        href={`/compliance/${report.month}`}
                        className="font-bold text-[var(--jd-red)] hover:underline"
                      >
                        Read Full Monthly Disclosure Report →
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* Privacy Note */}
        <section className="border-t border-stone-200 dark:border-stone-800 pt-6 text-xs text-stone-500 dark:text-stone-400">
          <p>
            <strong>Complainant Privacy Notice:</strong> In compliance with statutory digital privacy standards and data protection principles, individual complainant names, email addresses, telephone numbers, and sensitive correspondence are strictly excluded from public disclosure reports.
          </p>
        </section>
      </main>
    </PageShell>
  );
}
