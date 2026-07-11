import { GlobalBriefPageView } from "@/components/newsroom-platform/GlobalBriefPageView";
import { buildHubPageMetadata } from "@/lib/seo";

/** Global brief ISR — keep in sync with `ISR.globalBrief` in config/isr.ts */
export const revalidate = 90;

export const metadata = buildHubPageMetadata({
  title: "National News · Jan Darpan Chhattisgarh",
  description:
    "India national headlines, policy updates, and developing stories from the Jan Darpan national desk.",
  path: "/news/national",
  keywords: [
    "India news",
    "national headlines",
    "Indian politics",
    "national desk",
    "Jan Darpan Chhattisgarh",
  ],
});

export default function NationalNewsPage() {
  return <GlobalBriefPageView segment="national" />;
}
