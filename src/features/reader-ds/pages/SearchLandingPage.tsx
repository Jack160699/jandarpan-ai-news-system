"use client";

import { useRouter } from "next/navigation";
import { ReaderShell } from "../components/ReaderShell";
import { SearchOverlay } from "../components/SearchOverlay";

/**
 * `/search` without a query — A6 search overlay as the page surface.
 * Results (`?q=`) use SearchResultsPageView instead.
 */
export function SearchLandingPage() {
  const router = useRouter();

  return (
    <ReaderShell hideBottomNav includeSearchOverlay={false}>
      <SearchOverlay forceOpen onDismiss={() => router.push("/")} />
    </ReaderShell>
  );
}
