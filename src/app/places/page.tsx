import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";
import { DistrictPicker } from "@/features/district-picker/DistrictPicker";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: `Choose your district · ${BRAND.nameEn}`,
  description: "Select a Chhattisgarh district and open its local news edition.",
};

export default function PlacesPage() {
  return (
    <PageShell variant="news">
      <DistrictPicker />
    </PageShell>
  );
}
