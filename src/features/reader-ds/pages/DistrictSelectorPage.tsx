"use client";

import { Masthead } from "../components/Masthead";
import { ReaderShell } from "../components/ReaderShell";
import { DistrictSelector } from "../components/DistrictSelector";
import { useJdDsT } from "../i18n";
import type { CgDistrict } from "@/lib/regional/districts";

type Props = {
  districts: Array<Pick<CgDistrict, "slug" | "name" | "nameHi">>;
  selectedSlug?: string | null;
};

/** A10 — district selector page */
export function DistrictSelectorPage({ districts, selectedSlug }: Props) {
  const { t } = useJdDsT();
  return (
    <ReaderShell hideBottomNav>
      <Masthead back pageTitle={t("district.chooseTitle")} backHref="/" />
      <main id="main-content" role="main" style={{ flex: 1, background: "var(--jd-paper)" }}>
        <DistrictSelector districts={districts} selectedSlug={selectedSlug} />
      </main>
    </ReaderShell>
  );
}
