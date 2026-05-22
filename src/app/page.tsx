import { Suspense } from "react";
import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";
import { BRAND } from "@/lib/brand";
import { getGeneratedHomepageFeed } from "@/lib/homepage/get-feed";
import { PRODUCTION_ROBOTS, REGIONAL_KEYWORDS, SITE_URL } from "@/lib/seo";
import { Footer } from "@/sections/Footer";
import {
  HomepageEmpty,
  HomepageSkeleton,
  HomepageView,
} from "@/sections/homepage";

export const metadata: Metadata = {
  title: `${BRAND.nameEn} — Chhattisgarh`,
  description:
    "Premium regional news from Chhattisgarh — AI-edited stories from Raipur, Bastar, and across the state.",
  keywords: REGIONAL_KEYWORDS,
  alternates: { canonical: "/" },
  robots: PRODUCTION_ROBOTS,
  openGraph: {
    title: `${BRAND.nameEn} — Chhattisgarh`,
    description: BRAND.taglineEn,
    type: "website",
    url: SITE_URL,
    locale: "hi_IN",
    siteName: BRAND.nameEn,
  },
  twitter: {
    card: "summary_large_image",
    title: BRAND.nameEn,
    description: BRAND.taglineEn,
  },
};

/** ISR — edge-friendly cache, 60s freshness */
export const revalidate = 60;

async function HomepageContent() {
  const feed = await getGeneratedHomepageFeed();

  if (!feed) {
    return <HomepageEmpty />;
  }

  return <HomepageView feed={feed} />;
}

export default function Home() {
  return (
    <PageShell variant="news">
      <main
        id="main-content"
        className="hp-root relative z-[2]"
        role="main"
      >
        <Suspense fallback={<HomepageSkeleton />}>
          <HomepageContent />
        </Suspense>
        <Footer />
      </main>
    </PageShell>
  );
}
