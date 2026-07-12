"use client";

import { useCallback, useEffect, useState } from "react";
import {
  loadHomepageLayout,
  saveHomepageLayout,
  DEFAULT_LAYOUT_PREFS,
} from "@/lib/personalization/homepage-layout";
import type { HomepageLayoutPrefs } from "@/lib/personalization/types";
import { syncOnboardingCookie } from "@/lib/personalization/cookies";
import { PREFS_STORAGE_KEY } from "@/lib/reader-preferences";

export function useHomepageLayout() {
  const [layout, setLayout] = useState<HomepageLayoutPrefs>(DEFAULT_LAYOUT_PREFS);

  useEffect(() => {
    let loaded = loadHomepageLayout();
    const hadPrefs = Boolean(localStorage.getItem(PREFS_STORAGE_KEY));
    if (!loaded.onboardingDone && hadPrefs) {
      loaded = { ...loaded, onboardingDone: true };
      saveHomepageLayout(loaded);
    }
    if (loaded.onboardingDone) syncOnboardingCookie(true);
    setLayout(loaded);
  }, []);

  const persist = useCallback((next: HomepageLayoutPrefs) => {
    setLayout(next);
    saveHomepageLayout(next);
    if (next.onboardingDone) syncOnboardingCookie(true);
  }, []);

  return { layout, persist };
}
