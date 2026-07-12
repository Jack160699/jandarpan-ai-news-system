import type { Metadata } from "next";
import { BRAND } from "@/lib/brand";
import { buildUtilityPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildUtilityPageMetadata({
  title: `Reader Account · ${BRAND.nameEn}`,
  description:
    "Sign in to personalize your Chhattisgarh news feed — Google, email link, or phone OTP.",
  path: "/login",
});

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
