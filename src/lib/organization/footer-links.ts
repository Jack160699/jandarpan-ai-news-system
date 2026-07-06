export type FooterLegalLink = {
  href: string;
  label: string;
};

export const FOOTER_LEGAL_LINKS: FooterLegalLink[] = [
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
  { href: "/editorial-policy", label: "Editorial Policy" },
  { href: "/corrections", label: "Corrections" },
  {
    href: "/copyright-content-removal",
    label: "Copyright & Content Removal",
  },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/feed.xml", label: "RSS" },
];
