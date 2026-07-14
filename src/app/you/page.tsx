import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";
import { ProfileExperienceV3 } from "@/features/profile-v3";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: `Your reader space · ${BRAND.nameEn}`,
  description: "Reading history, saved stories, districts, interests, alerts, language and appearance settings.",
};

export default function YouPage() {
  return (
    <PageShell variant="news">
      <ProfileExperienceV3 />
    </PageShell>
  );
}
