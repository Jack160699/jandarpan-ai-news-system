/** Editorial footer — static content & nav */

export const FOOTER_QUICK_LINKS = [
  { href: "/", key: "home" as const },
  { href: "/live", key: "live" as const },
  { href: "/category/politics", key: "politics" as const },
  { href: "/category/sports", key: "sports" as const },
  { href: "/search", key: "search" as const },
  { href: "/archive", key: "archive" as const },
] as const;

export const FOOTER_DISTRICT_SLUGS = [
  "raipur",
  "bilaspur",
  "durg",
  "korba",
  "bastar",
  "raigarh",
  "rajnandgaon",
  "dhamtari",
] as const;

export type FooterSocialId =
  | "facebook"
  | "youtube"
  | "twitter"
  | "whatsapp"
  | "instagram";

export const FOOTER_SOCIAL: {
  id: FooterSocialId;
  href: string;
  label: string;
}[] = [
  { id: "facebook", href: "https://www.facebook.com", label: "Facebook" },
  { id: "youtube", href: "https://www.youtube.com", label: "YouTube" },
  { id: "twitter", href: "https://twitter.com", label: "X" },
  { id: "whatsapp", href: "https://wa.me", label: "WhatsApp" },
  { id: "instagram", href: "https://www.instagram.com", label: "Instagram" },
];
