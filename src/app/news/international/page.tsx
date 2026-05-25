import type { Metadata } from "next";
import { GlobalBriefPageView } from "@/components/newsroom-platform/GlobalBriefPageView";
/** Global brief ISR — keep in sync with `ISR.globalBrief` in config/isr.ts */
export const revalidate = 90;

export const metadata: Metadata = {
  title: "International News | Jan Darpan Chhattisgarh",
  description: "World desk and international coverage.",
};

export default function InternationalNewsPage() {
  return <GlobalBriefPageView segment="international" />;
}
