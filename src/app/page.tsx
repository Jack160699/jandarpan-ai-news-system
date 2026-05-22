import { Suspense } from "react";
import { PageShell } from "@/components/layout/PageShell";
import { LiveNewsSkeleton } from "@/components/live/LiveNewsSkeleton";
import { BreakingNews } from "@/sections/BreakingNews";
import { Footer } from "@/sections/Footer";
import { LiveNewsHome } from "@/sections/live/LiveNewsHome";
import { getLiveNewsFeed } from "@/lib/news-db";
import { isSupabaseConfigured } from "@/lib/supabase";
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
  const configured = isSupabaseConfigured();
  const feed = await getLiveNewsFeed();

  if (!feed?.hero) {
    const hint = !configured
      ? "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY on this deployment. Check GET /api/health → supabase_env.urlHostname matches your Supabase dashboard Project URL exactly."
      : "Homepage cannot reach Supabase. Open /api/health — if anon_read_error is TypeError: fetch failed / ENOTFOUND, fix a typo in NEXT_PUBLIC_SUPABASE_URL. If rows exist but pool is empty, run migration 005 for RLS.";

    return (
      <section className="feed-section py-16 text-center px-4">
        <p className="text-[var(--ink-muted)]">
          Live wire unavailable — no articles returned from{" "}
          <code className="text-xs">news_articles</code>.
        </p>
        <p className="mt-3 text-sm text-[var(--ink-muted)] max-w-md mx-auto">
          {hint}
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
