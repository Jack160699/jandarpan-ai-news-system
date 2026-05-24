import { PageShell } from "@/components/layout/PageShell";
import { ArchivePageContent } from "@/sections/ArchivePageContent";
import type { Metadata } from "next";
import { BRAND } from "@/lib/brand";
import { PRODUCTION_ROBOTS, SITE_URL, webPageJsonLd } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Profile",
  description:
    "Your profile, preferences, and saved stories from Jan Darpan Chhattisgarh.",
  alternates: { canonical: "/archive" },
  robots: PRODUCTION_ROBOTS,
  openGraph: {
    title: `Profile · ${BRAND.nameEn}`,
    description:
      "Preferences, alerts, and bookmarked Chhattisgarh news stories.",
    type: "website",
    url: `${SITE_URL}/archive`,
    locale: "hi_IN",
    siteName: BRAND.nameEn,
  },
  twitter: {
    card: "summary",
    title: `Profile · ${BRAND.nameEn}`,
    description:
      "Preferences, alerts, and bookmarked Chhattisgarh news stories.",
  },
};

export default function ArchivePage() {
  const jsonLd = webPageJsonLd(
    "Profile",
    "Your preferences, alerts, and saved stories from Jan Darpan Chhattisgarh.",
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
