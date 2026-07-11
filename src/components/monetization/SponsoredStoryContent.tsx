"use client";

import type { ReactNode } from "react";
import { isMonetizationV3Enabled } from "@/features/monetization-v3/config";
import { SponsoredStoryLayout } from "@/features/monetization-v3/components/SponsoredStoryLayout";
import "@/features/monetization-v3/styles/monetization-v3.css";
import type { SponsoredStoryMeta } from "@/lib/monetization/types";
import { SponsoredStoryBanner } from "./SponsoredStoryBanner";

type SponsoredStoryContentProps = {
  meta: SponsoredStoryMeta;
  children: ReactNode;
};

/**
 * Sponsored story surface — legacy banner or V3 full layout (JDP-020).
 */
export function SponsoredStoryContent({
  meta,
  children,
}: SponsoredStoryContentProps) {
  if (isMonetizationV3Enabled()) {
    return <SponsoredStoryLayout meta={meta}>{children}</SponsoredStoryLayout>;
  }

  return (
    <>
      <SponsoredStoryBanner meta={meta} />
      {children}
    </>
  );
}
