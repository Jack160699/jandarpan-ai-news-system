/**
 * Invalidate homepage cache after ingestion
 */

import { revalidatePath, revalidateTag } from "next/cache";
import { LIVE_NEWS_CACHE_TAG } from "@/lib/news/home-ranking";

export function revalidateLiveHomepage(): void {
  try {
    revalidateTag(LIVE_NEWS_CACHE_TAG, "default");
    revalidatePath("/");
  } catch (err) {
    console.warn("[revalidate] live homepage:", err);
  }
}
