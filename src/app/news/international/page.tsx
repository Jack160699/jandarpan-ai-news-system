import { GlobalBriefPageView } from "@/components/newsroom-platform/GlobalBriefPageView";
import { buildHubPageMetadata } from "@/lib/seo";

/** Global brief ISR — keep in sync with `ISR.globalBrief` in config/isr.ts */
export const revalidate = 90;

export const metadata = buildHubPageMetadata({
  title: "International News · Jan Darpan Chhattisgarh",
  description:
    "World news, global affairs, and international coverage curated for Chhattisgarh readers.",
  path: "/news/international",
  keywords: [
    "world news",
    "international headlines",
    "global affairs",
    "world desk",
    "Jan Darpan Chhattisgarh",
  ],
});

export default function InternationalNewsPage() {
  return <GlobalBriefPageView segment="international" />;
}
