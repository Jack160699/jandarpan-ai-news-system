import { GlobalBriefPageView } from "@/components/newsroom-platform/GlobalBriefPageView";
import { isReaderDesignSystemEnabled } from "@/features/reader-ds/config";
import { CategoryPageView } from "@/features/reader-ds/pages";
import { getCachedCategoryHubData } from "@/lib/category/get-category-hub";
import { buildHubPageMetadata } from "@/lib/seo";

/** Global brief ISR — keep in sync with `ISR.globalBrief` in config/isr.ts */
export const revalidate = 90;

export const metadata = buildHubPageMetadata({
  title: "National News · Jan Darpan · जन दर्पण",
  description:
    "India national headlines, policy updates, and developing stories from the Jan Darpan national desk.",
  path: "/news/national",
  keywords: [
    "India news",
    "national headlines",
    "Indian politics",
    "national desk",
    "Jan Darpan",
    "Jan Darpan — Chhattisgarh & India",
  ],
});

export default async function NationalNewsPage() {
  if (isReaderDesignSystemEnabled()) {
    const hub = await getCachedCategoryHubData("politics");
    const articles = hub?.homeArticles ?? [];
    return (
      <CategoryPageView
        titleHi="भारत"
        titleEn="National News"
        slug="national"
        articles={articles}
        chips={[
          { label: "सभी", href: "/news/national" },
          { label: "छत्तीसगढ़", href: "/category/chhattisgarh" },
          { label: "राजनीति", href: "/category/politics" },
          { label: "व्यापार", href: "/category/business" },
          { label: "खेल", href: "/category/sports" },
        ]}
      />
    );
  }
  return <GlobalBriefPageView segment="national" />;
}

