import type { Metadata } from "next";
import { BRAND } from "@/lib/brand";
import { buildUtilityPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildUtilityPageMetadata({
  title: `Reader Account · ${BRAND.nameEn}`,
  description:
    "जनदर्पण में साइन इन करें — Google, ईमेल लिंक, या मेहमान के रूप में जारी रखें।",
  path: "/login",
});

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
