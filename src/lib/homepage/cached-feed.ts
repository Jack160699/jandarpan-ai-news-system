import { cache } from "react";
import { getGeneratedHomepageFeed } from "@/lib/homepage/get-feed";

/** Dedupe homepage feed fetch within a single request */
export const getCachedGeneratedHomepageFeed = cache(getGeneratedHomepageFeed);
