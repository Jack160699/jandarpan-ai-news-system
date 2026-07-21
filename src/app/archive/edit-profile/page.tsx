import { EditProfilePage } from "@/features/reader-ds/experience";
import { isReaderDesignSystemEnabled } from "@/features/reader-ds/config";
import { buildUtilityPageMetadata } from "@/lib/seo/metadata";
import { BRAND } from "@/lib/brand";
import { redirect } from "next/navigation";

export const metadata = buildUtilityPageMetadata({
  title: `Edit profile · ${BRAND.nameEn}`,
  description: "Edit your Jan Darpan display name and photo.",
  path: "/archive/edit-profile",
});

export default function ArchiveEditProfilePage() {
  if (!isReaderDesignSystemEnabled()) redirect("/archive");
  return <EditProfilePage />;
}
