"use client";

import Link from "next/link";
import { FooterSocialIcon } from "@/components/footer/FooterSocialIcon";
import { TenantLogo } from "@/components/tenant/TenantLogo";
import { FOOTER_LEGAL_LINKS } from "@/lib/organization/footer-links";
import { buildOrganizationSocialLinks } from "@/lib/organization/social";
import type { OrganizationSocialId } from "@/lib/organization/types";
import type { FooterSocialId } from "@/lib/footer/config";
import { useLanguage } from "@/providers/LanguageProvider";
import { useOrganization } from "@/providers/OrganizationProvider";
import { useTenant } from "@/providers/TenantProvider";

const SOCIAL_ICON_MAP: Partial<Record<OrganizationSocialId, FooterSocialId>> = {
  facebook: "facebook",
  instagram: "instagram",
  x: "twitter",
  youtube: "youtube",
  whatsapp: "whatsapp",
};

export function Footer() {
  // ZERO FOOTER RULE: Completely removed from page composition across the entire app.
  return null;
}
