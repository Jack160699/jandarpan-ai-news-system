import Link from "next/link";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/layout/PageShell";
import { buildLegalPageMetadata } from "@/lib/legal/page-metadata";
import { createAdminServerClient } from "@/lib/supabase/admin";
import { CANONICAL_IDENTITY } from "@/lib/compliance/canonical-identity";

type Props = {
  params: Promise<{ month: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { month } = await params;
  return buildLegalPageMetadata({
    title: `Monthly Compliance Disclosure (${month}) · Jan Darpan`,
    description: `Official monthly compliance and grievance redressal disclosure report for ${month} published under Rule 19 of the IT Rules, 2021.`,
    path: `/compliance/${month}`,
  });
}

export default async function MonthlyComplianceReportPage({ params }: Props) {
  const { month } = await params;
  if (!/^\d{4}-\d{2}$/.test(month)) {
    notFound();
  }

  const supabase = createAdminServerClient();
  const { data: report } = await (supabase as any)
    .from("compliance_reports")
    .select("*")
    .eq("month", month)
    .maybeSingle();

  if (!report || report.status !== "PUBLISHED") {
    // If report is not yet published, show a graceful notice or notFound
    return (
      <PageShell pageTitle={`Compliance Report ${month} · Pending Publication`}>
        <main className="nr-root pl-container mx-auto max-w-3xl py-12 px-4 text-center">
          <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100 mb-2">
            Report Pending Human Approval ({month})
          </h1>
          <p className="text-stone-600 dark:text-stone-400 text-sm max-w-md mx-auto mb-6">
            The statutory compliance disclosure for {month} is currently in validation and awaiting authorized human sign-off before public publication under Rule 19.
          </p>
          <Link
            href="/compliance"
            className="text-xs font-bold text-[var(--jd-red)] hover:underline"
          >
            ← Return to Compliance Archive
          </Link>
        </main>
      </PageShell>
    );
  }

  const [y, m] = month.split("-");
  const monthName = new Date(Date.UTC(parseInt(y, 10), parseInt(m, 10) - 1, 1)).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  const metrics = report.metrics || {};

  return (
    <PageShell pageTitle={`Monthly Compliance Report · ${monthName}`}>
      <main
        id="main-content"
        className="nr-root pl-container mx-auto max-w-3xl py-8 pb-24 px-4 text-stone-800 dark:text-stone-200"
      >
        <nav aria-label="Breadcrumb" className="mb-6 text-xs text-stone-500">
          <Link href="/" className="hover:underline text-[var(--jd-red)] font-semibold">
            Home
          </Link>
          <span className="mx-2 text-stone-400">/</span>
          <Link href="/compliance" className="hover:underline text-[var(--jd-red)] font-semibold">
            Compliance
          </Link>
          <span className="mx-2 text-stone-400">/</span>
          <span className="text-stone-700 dark:text-stone-300 font-medium">{month}</span>
        </nav>

        <header className="border-b border-stone-200 dark:border-stone-800 pb-6 mb-8">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300">
              Statutory Disclosure · Rule 19
            </span>
            <span className="text-xs text-stone-500">
              Published on {new Date(report.published_at).toLocaleDateString()}
            </span>
          </div>

          <h1 className="m-0 jd-serif text-3xl md:text-4xl font-extrabold tracking-tight text-stone-900 dark:text-stone-50">
            Monthly Grievance Report — {monthName}
          </h1>
          <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
            Reporting Period: <strong>{report.period_start}</strong> to <strong>{report.period_end}</strong>
          </p>
        </header>

        {/* Publisher & Entity Header Card */}
        <section className="mb-8 p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/60 text-xs text-stone-600 dark:text-stone-400">
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <dt className="font-semibold text-stone-500">Publication Title</dt>
              <dd className="font-bold text-stone-900 dark:text-stone-100">{CANONICAL_IDENTITY.publication.name}</dd>
            </div>
            <div>
              <dt className="font-semibold text-stone-500">Legal Publisher</dt>
              <dd className="font-bold text-stone-900 dark:text-stone-100">{CANONICAL_IDENTITY.legalEntity.legalName}</dd>
            </div>
            <div>
              <dt className="font-semibold text-stone-500">Corporate Identity Number</dt>
              <dd className="font-mono text-stone-800 dark:text-stone-200">{CANONICAL_IDENTITY.legalEntity.cin}</dd>
            </div>
            <div>
              <dt className="font-semibold text-stone-500">Designated Grievance Officer</dt>
              <dd className="text-stone-800 dark:text-stone-200">{CANONICAL_IDENTITY.grievanceOfficer.name}</dd>
            </div>
          </dl>
        </section>

        {/* Detailed Disclosure Table */}
        <section className="mb-10" aria-labelledby="statutory-table">
          <h2 id="statutory-table" className="m-0 text-xl font-bold text-stone-900 dark:text-stone-100 mb-4">
            Grievance Redressal Record
          </h2>

          <div className="overflow-hidden rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900">
            <table className="w-full text-left text-sm">
              <thead className="bg-stone-50 dark:bg-stone-950 border-b border-stone-200 dark:border-stone-800 text-xs font-bold uppercase tracking-wider text-stone-500">
                <tr>
                  <th className="py-3 px-4">Statutory Parameter / Category</th>
                  <th className="py-3 px-4 text-center">Count</th>
                  <th className="py-3 px-4">Statutory Standard</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800 text-stone-800 dark:text-stone-200">
                <tr>
                  <td className="py-3 px-4 font-semibold">Grievances Received</td>
                  <td className="py-3 px-4 text-center font-bold text-base">{metrics.grievancesReceived ?? 0}</td>
                  <td className="py-3 px-4 text-xs text-stone-500">Registered across Web, WhatsApp & Email</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-semibold">Grievances Acknowledged (&lt; 24h)</td>
                  <td className="py-3 px-4 text-center font-bold text-base">{metrics.grievancesAcknowledged ?? 0}</td>
                  <td className="py-3 px-4 text-xs text-stone-500">Rule 11(2)(a) 24-hour statutory target</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-semibold">Grievances Resolved</td>
                  <td className="py-3 px-4 text-center font-bold text-base text-green-600 dark:text-green-400">
                    {metrics.grievancesResolved ?? 0}
                  </td>
                  <td className="py-3 px-4 text-xs text-stone-500">Rule 11(2)(b) 15-day resolution target</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-semibold">Grievances Pending</td>
                  <td className="py-3 px-4 text-center font-bold text-base">{metrics.grievancesPending ?? 0}</td>
                  <td className="py-3 px-4 text-xs text-stone-500">Currently within active 15-day SLA clock</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-semibold">Action Taken (Corrections / Clarifications)</td>
                  <td className="py-3 px-4 text-center font-bold text-base">{metrics.actionsTakenCount ?? 0}</td>
                  <td className="py-3 px-4 text-xs text-stone-500">Editorial updates applied with public notice</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-semibold">Escalated to Level-II (Self-Regulating Body)</td>
                  <td className="py-3 px-4 text-center font-bold text-base">{metrics.grievancesEscalatedLevelII ?? 0}</td>
                  <td className="py-3 px-4 text-xs text-stone-500">External SRB review under Rule 12</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-semibold">Escalated to Level-III (Central Govt Oversight)</td>
                  <td className="py-3 px-4 text-center font-bold text-base">{metrics.grievancesEscalatedLevelIII ?? 0}</td>
                  <td className="py-3 px-4 text-xs text-stone-500">Inter-Departmental Committee under Rule 14</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-semibold">Orders / Directions Received from Ministry</td>
                  <td className="py-3 px-4 text-center font-bold text-base">{metrics.advisoriesOrOrdersReceivedCount ?? 0}</td>
                  <td className="py-3 px-4 text-xs text-stone-500">Official government directions</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Human Approval Sign-off Box */}
        <section className="mb-10 p-5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/40 text-xs text-stone-600 dark:text-stone-400 space-y-2">
          <p className="font-bold text-stone-900 dark:text-stone-100 text-sm">
            Statutory Approval & Verification Note
          </p>
          <p>
            This monthly compliance report has been verified against the underlying compliance database records and approved for publication by authorized personnel:
          </p>
          <p className="pt-1">
            <strong>Approved By:</strong> {report.approved_by || "Authorized Compliance Officer"}
            <br />
            <strong>Approval Timestamp:</strong> {new Date(report.approved_at || report.published_at).toLocaleString()}
          </p>
        </section>

        <footer className="border-t border-stone-200 dark:border-stone-800 pt-6 flex items-center justify-between text-xs">
          <Link
            href="/compliance"
            className="text-[var(--jd-red)] font-semibold hover:underline"
          >
            ← Back to All Monthly Reports
          </Link>
          <Link
            href="/grievance-redressal"
            className="text-[var(--jd-red)] font-semibold hover:underline"
          >
            File a New Grievance →
          </Link>
        </footer>
      </main>
    </PageShell>
  );
}
