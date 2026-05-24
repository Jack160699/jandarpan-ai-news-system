/** Editorial footer — static content & nav */

export type FooterQuickLinkKey =
  | "business"
  | "sports"
  | "jobs"
  | "technology"
  | "politics"
  | "entertainment"
  | "education"
  | "startup"
  | "agriculture"
  | "crime";

export const FOOTER_QUICK_LINKS: {
  href: string;
  key: FooterQuickLinkKey;
}[] = [
  { href: "/category/business", key: "business" },
  { href: "/category/sports", key: "sports" },
  { href: "/category/jobs", key: "jobs" },
  { href: "/category/technology", key: "technology" },
  { href: "/category/politics", key: "politics" },
  { href: "/category/entertainment", key: "entertainment" },
  { href: "/category/education", key: "education" },
  { href: "/category/startup", key: "startup" },
  { href: "/category/agriculture", key: "agriculture" },
  { href: "/category/crime", key: "crime" },
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
