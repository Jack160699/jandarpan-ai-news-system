import nextDynamic from "next/dynamic";
import { HyperlocalSkeleton } from "@/sections/homepage/HomepageSectionSkeletons";

export const HyperlocalFeeds = nextDynamic(
  () =>
    import("@/sections/homepage/HyperlocalFeeds").then((mod) => ({
      default: mod.HyperlocalFeeds,
    })),
  { loading: () => <HyperlocalSkeleton /> }
);
