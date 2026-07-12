import type { Metadata } from "next";
import { BRAND } from "@/lib/brand";
import { buildUtilityPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildUtilityPageMetadata({
  title: `Profile · ${BRAND.nameEn}`,
  description: "Reader profile — redirects to your saved stories and preferences.",
  path: "/profile",
});

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
