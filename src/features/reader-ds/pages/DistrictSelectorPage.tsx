import { Masthead } from "../components/Masthead";
import { ReaderShell } from "../components/ReaderShell";
import { DistrictSelector } from "../components/DistrictSelector";
import type { CgDistrict } from "@/lib/regional/districts";

type Props = {
  districts: Array<Pick<CgDistrict, "slug" | "name" | "nameHi">>;
  selectedSlug?: string | null;
};

/** A10 — ज़िला चयनकर्ता */
export function DistrictSelectorPage({ districts, selectedSlug }: Props) {
  return (
    <ReaderShell hideBottomNav>
      <Masthead back pageTitle="ज़िला चुनें" backHref="/" />
      <main id="main-content" role="main" style={{ flex: 1, background: "var(--jd-paper)" }}>
        <DistrictSelector districts={districts} selectedSlug={selectedSlug} />
      </main>
    </ReaderShell>
  );
}
