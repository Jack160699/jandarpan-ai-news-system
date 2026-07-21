import { getCachedGeneratedHomepageFeed } from "@/lib/homepage/cached-feed";
import { catalogFromFeed } from "./catalog";
import type { HomeArticle } from "@/lib/homepage/types";

export async function loadReaderCatalog(): Promise<HomeArticle[]> {
  const feed = await getCachedGeneratedHomepageFeed();
  return catalogFromFeed(feed);
}
