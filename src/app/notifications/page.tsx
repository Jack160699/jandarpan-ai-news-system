import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PageShell } from "@/components/layout/PageShell";
import { JsonLdScript } from "@/components/seo/JsonLdScript";
import { Footer } from "@/sections/Footer";
import {
  NotificationCenterPage,
  isNotificationCenterV3Enabled,
} from "@/features/notifications";
import { isReaderDesignSystemEnabled } from "@/features/reader-ds/config";
import { BRAND } from "@/lib/brand";
import {
  buildHubPageMetadata,
  breadcrumbListJsonLd,
  webPageJsonLd,
} from "@/lib/seo";
import { buildHomeBreadcrumb } from "@/lib/seo/breadcrumbs";

export const revalidate = 60;

const BASE_TITLE = `Notifications · ${BRAND.nameEn}`;
const BASE_DESCRIPTION =
  "Breaking alerts, government notices, and saved stories — your personalized notification inbox.";
const BASE_PATH = "/notifications";

export const metadata: Metadata = buildHubPageMetadata({
  title: BASE_TITLE,
  description: BASE_DESCRIPTION,
  path: BASE_PATH,
  keywords: [
    "notifications",
    "breaking alerts",
    "government alerts",
    "news alerts",
    "Chhattisgarh news",
  ],
});

/**
 * JDP-013 — Notification Center V3
 * Gated by NEXT_PUBLIC_NOTIFICATION_CENTER_V3=1 (default OFF).
 */
export default function NotificationsRoutePage() {
  if (isReaderDesignSystemEnabled()) {
    redirect("/archive/notifications");
  }
  if (!isNotificationCenterV3Enabled()) {
    notFound();
  }

  const jsonLd = [
    webPageJsonLd("Notifications", BASE_DESCRIPTION, BASE_PATH),
    breadcrumbListJsonLd([
      buildHomeBreadcrumb(),
      { name: "Notifications", href: BASE_PATH },
    ]),
  ];

  return (
    <PageShell variant="news">
      <JsonLdScript data={jsonLd} />
      <div className="nc-route-root nr-root">
        <NotificationCenterPage />
      </div>
      <Footer />
    </PageShell>
  );
}
