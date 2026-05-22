"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Refresh homepage server data every 60s for live wire */
export function HomeLiveRefresh() {
  const router = useRouter();

  useEffect(() => {
    const interval = setInterval(() => {
      router.refresh();
    }, 60_000);

    return () => clearInterval(interval);
  }, [router]);

  return null;
}
