"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  buildReferrerHref,
  isListRestorePath,
  loadStoryReferrer,
} from "@/lib/mobile/navigation-state";
import {
  resolveCurrentScrollPosition,
  restoreScrollPosition,
  saveScrollPosition,
} from "@/lib/mobile/scroll-retention";
import { useNavigation } from "@/providers/NavigationProvider";

function scheduleListRestore(path: string) {
  if (!isListRestorePath(path)) return;
  saveScrollPosition(path, resolveCurrentScrollPosition(path));
  restoreScrollPosition(path);
  window.setTimeout(() => restoreScrollPosition(path), 120);
  window.setTimeout(() => restoreScrollPosition(path), 450);
}

export function useStoryBack(fallbackHref = "/") {
  const router = useRouter();
  const { startNavigation } = useNavigation();

  return useCallback(() => {
    const referrer = loadStoryReferrer();
    const referrerHref = referrer ? buildReferrerHref(referrer) : null;

    if (typeof window !== "undefined" && window.history.length > 1) {
      const restorePath = referrer?.path ?? "/";
      router.back();
      scheduleListRestore(restorePath);
      return;
    }

    const target = referrerHref ?? fallbackHref;
    const restorePath = target.split("#")[0] || "/";
    if (referrer && referrer.path === restorePath) {
      saveScrollPosition(referrer.path, resolveCurrentScrollPosition(referrer.path));
    }
    startNavigation(target);
    router.push(target, { scroll: false });
    scheduleListRestore(restorePath);
  }, [router, startNavigation, fallbackHref]);
}
