import type { Metadata } from "next";
import { GlobalBriefPageView } from "@/components/newsroom-platform/GlobalBriefPageView";
/** Global brief ISR — keep in sync with `ISR.globalBrief` in config/isr.ts */
export const revalidate = 90;

export const metadata: Metadata = {
  title: "National News | Jan Darpan Chhattisgarh",
  description: "National headlines and India desk updates.",
};

export default function NationalNewsPage() {
  return <GlobalBriefPageView segment="national" />;
}
