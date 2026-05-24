import type { Metadata } from "next";
import { Suspense } from "react";
import { ReelsPage } from "@/features/reels/ReelsPage";
import { JsonLdScript } from "@/components/seo/JsonLdScript";
import { fetchShortsPool } from "@/lib/news/shorts/build-short";
import { BRAND } from "@/lib/brand";

export const revalidate = 60;

export const metadata: Metadata = {
  title: `News Reels · ${BRAND.nameEn}`,
  description:
    "Vertical 60-second news reels from Chhattisgarh and India — swipe to watch, read the full story anytime.",
  openGraph: {
    title: `News Reels · ${BRAND.nameEn}`,
    description:
      "Mobile news shorts with Hindi headlines, live updates, and regional coverage.",
    type: "website",
  },
  alternates: {
    canonical: "/shorts",
  },
  robots: { index: true, follow: true },
};

function shortsJsonLd(shorts: { headline: string; slug: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "News Shorts",
    itemListElement: shorts.slice(0, 12).map((s, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `/shorts/${s.slug}`,
      name: s.headline,
    })),
  };
}

export default async function ShortsPage() {
  const shorts = await fetchShortsPool(32);

  return (
    <>
      <JsonLdScript data={shortsJsonLd(shorts)} />
      <Suspense
        fallback={
          <div className="reels-page reels-page--loading" aria-busy="true">
            <p className="reels-empty">रील्स लोड हो रही हैं…</p>
          </div>
        }
      >
        <ReelsPage shorts={shorts} />
      </Suspense>
    </>
  );
}
