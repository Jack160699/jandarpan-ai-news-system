import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/layout/PageShell";
import { JsonLdScript } from "@/components/seo/JsonLdScript";
import { Footer } from "@/sections/Footer";
import { MorningBriefPage } from "@/features/morning-brief";
import { BRAND } from "@/lib/brand";
import { isMorningBriefEnabled } from "@/lib/morning-brief/config";
import {
  buildHubPageMetadata,
  breadcrumbListJsonLd,
  webPageJsonLd,
} from "@/lib/seo";
import { buildHomeBreadcrumb } from "@/lib/seo/breadcrumbs";

export const revalidate = 60;

const BASE_TITLE = `Morning Brief · ${BRAND.nameEn}`;
const BASE_DESCRIPTION =
  "Your personalized morning digest — breaking news, weather, traffic, jobs, and AI summary for Chhattisgarh.";
const BASE_PATH = "/morning-brief";

export const metadata: Metadata = buildHubPageMetadata({
  title: BASE_TITLE,
  description: BASE_DESCRIPTION,
  path: BASE_PATH,
  keywords: [
    "morning brief",
    "daily news digest",
    "Chhattisgarh news",
    "AI news summary",
    "local weather traffic",
  ],
});

export default function MorningBriefRoutePage() {
  if (!isMorningBriefEnabled()) {
    notFound();
  }

  const jsonLd = [
    webPageJsonLd("Morning Brief", BASE_DESCRIPTION, BASE_PATH),
    breadcrumbListJsonLd([
      buildHomeBreadcrumb(),
      { name: "Morning Brief", href: BASE_PATH },
    ]),
  ];

  return (
    <PageShell variant="news">
      <JsonLdScript data={jsonLd} />
      <div className="mb-route-root nr-root">
        <MorningBriefPage />
      </div>
      <Footer />
    </PageShell>
  );
}
