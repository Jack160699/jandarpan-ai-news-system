import { GlobalBriefPageView } from "@/components/newsroom-platform/GlobalBriefPageView";
import { isReaderDesignSystemEnabled } from "@/features/reader-ds/config";
import { CategoryPageView } from "@/features/reader-ds/pages";
import { getCachedCategoryHubData } from "@/lib/category/get-category-hub";
import { buildHubPageMetadata } from "@/lib/seo";

/** Global brief ISR — keep in sync with `ISR.globalBrief` in config/isr.ts */
export const revalidate = 90;

export const metadata = buildHubPageMetadata({
  title: "International News · Jan Darpan · जन दर्पण",
  description:
    "World news, global affairs, and international coverage curated for Indian readers.",
  path: "/news/international",
  keywords: [
    "world news",
    "international headlines",
    "global affairs",
    "world desk",
    "Jan Darpan",
  ],
});

export default async function InternationalNewsPage() {
  if (isReaderDesignSystemEnabled()) {
    const hub = await getCachedCategoryHubData("world");
    const articles = hub?.homeArticles ?? [];
    return (
      <CategoryPageView
        titleHi="विश्व"
        titleEn="International News"
        slug="international"
        articles={articles}
        chips={[
          { label: "सभी", href: "/news/international" },
          { label: "भारत", href: "/news/national" },
          { label: "व्यापार", href: "/category/business" },
          { label: "तकनीक", href: "/category/technology" },
        ]}
      />
    );
  }
  return <GlobalBriefPageView segment="international" />;
}

