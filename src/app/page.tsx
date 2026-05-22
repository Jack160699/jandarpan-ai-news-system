import { Suspense } from "react";
import { PageShell } from "@/components/layout/PageShell";
import { LiveNewsSkeleton } from "@/components/live/LiveNewsSkeleton";
import { BreakingNews } from "@/sections/BreakingNews";
import { Footer } from "@/sections/Footer";
import { LiveNewsHome } from "@/sections/live/LiveNewsHome";
import { getLiveNewsFeed } from "@/lib/news-db";
import type { Metadata } from "next";
import { BRAND } from "@/lib/brand";
import { PRODUCTION_ROBOTS, REGIONAL_KEYWORDS, SITE_URL } from "@/lib/seo";

export const metadata: Metadata = {
  title: `${BRAND.nameEn} — Live Edition`,
  description:
    "Live Chhattisgarh regional headlines — ranked wire from RSS and national sources.",
  keywords: REGIONAL_KEYWORDS,
  alternates: { canonical: "/" },
  robots: PRODUCTION_ROBOTS,
  openGraph: {
    title: `${BRAND.nameEn} — Live Edition`,
    description:
      "Live Chhattisgarh regional headlines — ranked wire from RSS and national sources.",
    type: "website",
    url: SITE_URL,
    locale: "hi_IN",
    siteName: BRAND.nameEn,
  },
  twitter: {
    card: "summary_large_image",
    title: `${BRAND.nameEn} — Live Edition`,
    description:
      "Live Chhattisgarh regional headlines — ranked wire from RSS and national sources.",
  },
};

/** ISR — aligns with 60s client refresh */
export const revalidate = 60;

async function LiveNewsSection() {
  const feed = await getLiveNewsFeed();

  if (!feed?.hero) {
    return (
      <section className="feed-section py-16 text-center">
        <p className="text-[var(--ink-muted)]">
          Live wire loading — run ingestion or check Supabase connection.
        </p>
      </section>
    );
  }

  const tickerHeadlines = [
    feed.hero.title,
    ...feed.justIn.slice(0, 4).map((a) => a.title),
  ];

  return (
    <>
      <BreakingNews headlines={tickerHeadlines} />
      <LiveNewsHome feed={feed} />
    </>
  );
}

export default function Home() {
  return (
    <PageShell variant="news">
      <main
        id="main-content"
        data-narrative-root
        className="home-news-flow mobile-comfort thumb-zone relative z-[2]"
        role="main"
      >
        <Suspense fallback={<LiveNewsSkeleton />}>
          <LiveNewsSection />
        </Suspense>
        <Footer />
      </main>
    </PageShell>
  );
}
