"use client";

import { useEffect } from "react";
import { useReaderPreferences } from "@/providers/ReaderPreferencesProvider";
import { Masthead } from "../components/Masthead";
import { ReaderShell } from "../components/ReaderShell";

/**
 * `/search` without a query — opens A6 overlay on the paper canvas.
 * Results (`?q=`) use SearchResultsPageView instead.
 */
export function SearchLandingPage() {
  const { setSearchOpen } = useReaderPreferences();

  useEffect(() => {
    setSearchOpen(true);
    return () => setSearchOpen(false);
  }, [setSearchOpen]);

  return (
    <ReaderShell activeNav="home">
      <Masthead />
      <main id="main-content" role="main" style={{ flex: 1, minHeight: 400 }} />
    </ReaderShell>
  );
}
