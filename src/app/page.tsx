import { Suspense } from "react";
import { PageShell } from "@/components/layout/PageShell";
import { LiveNewsSkeleton } from "@/components/live/LiveNewsSkeleton";
import { ConceptBanner } from "@/components/institution/ConceptBanner";
import { ContinueRibbon } from "@/components/editorial";
import { BreakingNews } from "@/sections/BreakingNews";
import { Footer } from "@/sections/Footer";
import { EditorialHomeSections } from "@/sections/live/EditorialHomeSections";
import { LiveNewsHome } from "@/sections/live/LiveNewsHome";
import { getLiveNewsFeed } from "@/lib/news-db";
import { BRAND } from "@/lib/brand";

export const metadata = {
  title: `${BRAND.nameEn} — Today's Edition`,
  description:
    "Live headlines and regional journalism from Chhattisgarh — CG Bhaskar digital edition.",
  alternates: { canonical: "/" },
};

/** Revalidate homepage every 5 minutes (ISR) */
export const revalidate = 300;

async function LiveNewsSection() {
  const feed = await getLiveNewsFeed();

  if (!feed?.hero) {
    return <EditorialHomeSections />;
  }

  return (
    <>
      <LiveNewsHome feed={feed} />
      <EditorialHomeSections />
    </>
  );
}

export default function Home() {
  return (
    <PageShell variant="news">
      <ConceptBanner />
      <ContinueRibbon />
      <main
        id="main-content"
        data-narrative-root
        className="home-news-flow mobile-comfort thumb-zone relative z-[2]"
        role="main"
      >
        <BreakingNews />
        <Suspense fallback={<LiveNewsSkeleton />}>
          <LiveNewsSection />
        </Suspense>
        <Footer />
      </main>
    </PageShell>
  );
}
