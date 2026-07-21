"use client";

import { useEffect } from "react";

/** Registers minimal SW for downloaded-article offline support only. */
export function OfflineServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV === "development") {
      // Still register in Preview/prod; skip noisy local HMR churn only when explicitly disabled
    }
    let cancelled = false;
    void navigator.serviceWorker
      .register("/jd-offline-sw.js", { scope: "/" })
      .then((reg) => {
        if (!cancelled) reg.update().catch(() => undefined);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);
  return null;
}
