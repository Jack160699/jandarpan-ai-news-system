import type { Metadata } from "next";
import { BRAND } from "@/lib/brand";
import { buildUtilityPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildUtilityPageMetadata({
  title: `Saved Stories · ${BRAND.nameEn}`,
  description: "Your bookmarked Chhattisgarh news stories — redirects to your reader profile.",
  path: "/saved",
});

export default function SavedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
