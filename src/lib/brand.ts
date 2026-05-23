/** Legacy brand constants — default tenant preset (prefer `getTenantConfig()`). */

import { CG_BHASKAR_TENANT } from "@/lib/tenant/presets/cg-bhaskar";

export const BRAND = {
  nameEn: CG_BHASKAR_TENANT.branding.nameEn,
  nameHi: CG_BHASKAR_TENANT.branding.nameHi,
  taglineEn: CG_BHASKAR_TENANT.branding.taglineEn,
  taglineHi: CG_BHASKAR_TENANT.branding.taglineHi,
  conceptLabel: CG_BHASKAR_TENANT.branding.conceptLabel ?? "AI Newsroom",
  founded: 1958,
  volume: 68,
  editionNumber: 2847,
  regionalEdition: "Raipur · Statewide",
  press: "CG Bhaskar House · Pandri, Raipur",
  registry: "RNI CGHIN/2009/31245",
} as const;

export const EDITORIAL_CATEGORIES = [
  { id: "chhattisgarh", label: "Chhattisgarh", href: "#editorial" },
  { id: "raipur", label: "Raipur", href: "#editorial" },
  { id: "politics", label: "Politics", href: "#editorial" },
  { id: "business", label: "Business", href: "#editorial" },
  { id: "education", label: "Education", href: "#editorial" },
  { id: "sports", label: "Sports", href: "#sports" },
  { id: "investigations", label: "Investigations", href: "#investigations" },
  { id: "culture", label: "Culture", href: "#editorial" },
  { id: "editorial", label: "Editorial", href: "#opinion" },
] as const;

export const REGIONAL_MARKERS = [
  "Raipur city",
  "Bilaspur",
  "Durg-Bhilai",
  "Bastar",
  "Rajnandgaon",
] as const;
