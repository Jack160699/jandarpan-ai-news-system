"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  buildReferrerHref,
  loadStoryReferrer,
} from "@/lib/mobile/navigation-state";
import { useNavigation } from "@/providers/NavigationProvider";

export function useStoryBack(fallbackHref = "/") {
  const router = useRouter();
  const { startNavigation } = useNavigation();

  return useCallback(() => {
    const referrer = loadStoryReferrer();
    const referrerHref = referrer ? buildReferrerHref(referrer) : null;

    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    const target = referrerHref ?? fallbackHref;
    startNavigation(target);
    router.push(target);
  }, [router, startNavigation, fallbackHref]);
}
