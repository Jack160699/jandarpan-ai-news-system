import { PageShell } from "@/components/layout/PageShell";
import { ArchivePageContent } from "@/sections/ArchivePageContent";
import type { Metadata } from "next";
import { BRAND } from "@/lib/brand";
import { PRODUCTION_ROBOTS, SITE_URL, webPageJsonLd } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Saved stories",
  description:
    "Your saved stories from Hamar Chhattisgarh — read again anytime.",
  alternates: { canonical: "/archive" },
  robots: PRODUCTION_ROBOTS,
  openGraph: {
    title: `Saved stories · ${BRAND.nameEn}`,
    description:
      "Bookmarked Chhattisgarh news stories — read again anytime.",
    type: "website",
    url: `${SITE_URL}/archive`,
    locale: "hi_IN",
    siteName: BRAND.nameEn,
  },
  twitter: {
    card: "summary",
    title: `Saved stories · ${BRAND.nameEn}`,
    description:
      "Bookmarked Chhattisgarh news stories — read again anytime.",
  },
};

export default function ArchivePage() {
  const jsonLd = webPageJsonLd(
    "Saved stories",
    "Stories you saved from Hamar Chhattisgarh regional coverage.",
    "/archive"
  );

  return (
    <PageShell variant="news">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ArchivePageContent />
    </PageShell>
  );
}
