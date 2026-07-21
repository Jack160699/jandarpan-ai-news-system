import { NotificationPrefsPage } from "@/features/reader-ds/experience";
import { isReaderDesignSystemEnabled } from "@/features/reader-ds/config";
import { buildUtilityPageMetadata } from "@/lib/seo/metadata";
import { BRAND } from "@/lib/brand";
import { redirect } from "next/navigation";

export const metadata = buildUtilityPageMetadata({
  title: `Notification preferences · ${BRAND.nameEn}`,
  description: "Choose which alerts you receive.",
  path: "/archive/notifications",
});

export default function ArchiveNotificationsPage() {
  if (!isReaderDesignSystemEnabled()) redirect("/notifications");
  return <NotificationPrefsPage />;
}
