"use client";

import { JanDarpanLive } from "@/features/jd-live";
import { useJdDsT } from "@/features/reader-ds/i18n";

export function LiveClientView() {
  const { locale } = useJdDsT();
  return <JanDarpanLive initialLanguage={locale === "en" ? "en" : "hi"} />;
}
