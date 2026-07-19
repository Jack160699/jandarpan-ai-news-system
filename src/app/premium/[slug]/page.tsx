import { notFound } from "next/navigation";
import Link from "next/link";
import { PageShell } from "@/components/layout/PageShell";
import { ReaderPremiumReportPage } from "@/features/reader-ds/article";
import { isReaderDesignSystemEnabled } from "@/features/reader-ds/config";
import { PremiumPaywallPage } from "@/features/reader-ds/monetization";
import { createAdminServerClient, isSupabaseConfigured } from "@/lib/supabase";
import { buildPageMetadata } from "@/lib/seo";
import { getTenantConfig } from "@/lib/tenant/resolve";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const tenant = await getTenantConfig();

  if (!isSupabaseConfigured()) {
    return { title: "Premium report" };
  }

  const supabase = createAdminServerClient();
  const { data } = await supabase
    .from("premium_reports")
    .select("title, excerpt")
    .eq("tenant_id", tenant.id)
    .eq("slug", slug)
    .maybeSingle();

  if (!data) return { title: "Report not found" };

  return buildPageMetadata({
    title: data.title,
    description: data.excerpt ?? "Premium report",
    path: `/premium/${slug}`,
    noindex: true,
  });
}

export default async function PremiumReportPage({ params }: PageProps) {
  const { slug } = await params;
  const tenant = await getTenantConfig();

  if (!isSupabaseConfigured()) {
    notFound();
  }

  const supabase = createAdminServerClient();
  const { data: report } = await supabase
    .from("premium_reports")
    .select("*")
    .eq("tenant_id", tenant.id)
    .eq("slug", slug)
    .maybeSingle();

  if (!report) notFound();

  if (isReaderDesignSystemEnabled()) {
    const reportModel = {
      slug: report.slug,
      title: report.title,
      excerpt: report.excerpt,
      is_paywalled: report.is_paywalled,
      price_inr: report.price_inr,
      content_path: report.content_path,
    };
    if (report.is_paywalled) {
      return <PremiumPaywallPage report={reportModel} />;
    }
    return <ReaderPremiumReportPage report={reportModel} />;
  }

  return (
    <PageShell variant="news">
      <main id="main-content" className="nr-wrap py-10 max-w-2xl mx-auto">
        <p className="text-xs uppercase tracking-wider text-[var(--ink-muted)] mb-2">
          Premium report
        </p>
        <h1 className="text-2xl font-semibold mb-4">{report.title}</h1>
        {report.excerpt ? (
          <p className="text-[var(--ink-muted)] mb-6">{report.excerpt}</p>
        ) : null}

        {report.is_paywalled ? (
          <div className="mnr-unit mnr-membership p-6 rounded-xl">
            <p className="font-medium mb-2">
              Unlock for ₹{report.price_inr}
            </p>
            <p className="text-sm text-[var(--ink-muted)] mb-4">
              Member subscribers get full access to premium reports and ad-light
              reading. Join membership to unlock when checkout goes live.
            </p>
            <Link
              href="/membership"
              className="inline-block px-4 py-2 rounded-lg bg-[var(--brand-maroon)] text-white text-sm font-medium"
            >
              View membership plans
            </Link>
          </div>
        ) : report.content_path ? (
          <p className="story-prose-p">
            Full report content is being prepared for members. Check back soon or
            view membership options.
          </p>
        ) : (
          <p className="story-prose-p text-[var(--ink-muted)]">
            This report preview is available. Full content will be published here
            when ready.
          </p>
        )}

        <p className="mt-8">
          <Link href="/" className="text-[var(--brand-maroon)]">
            ← Home
          </Link>
        </p>
      </main>
    </PageShell>
  );
}
