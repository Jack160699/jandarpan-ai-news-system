import type {
  OrganizationSettings,
  OrganizationSocialId,
  OrganizationSocialLink,
} from "./types";

const SOCIAL_META: Record<
  OrganizationSocialId,
  { label: string; buildHref?: (raw: string) => string }
> = {
  facebook: { label: "Facebook" },
  instagram: { label: "Instagram" },
  x: { label: "X" },
  youtube: { label: "YouTube" },
  linkedin: { label: "LinkedIn" },
  telegram: {
    label: "Telegram",
    buildHref: (raw) =>
      raw.startsWith("http") ? raw : `https://t.me/${raw.replace(/^@/, "")}`,
  },
  whatsapp: {
    label: "WhatsApp",
    buildHref: (raw) =>
      raw.startsWith("http")
        ? raw
        : `https://wa.me/${raw.replace(/\D/g, "")}`,
  },
};

export function buildOrganizationSocialLinks(
  settings: OrganizationSettings
): OrganizationSocialLink[] {
  const links: OrganizationSocialLink[] = [];
  const keys: OrganizationSocialId[] = [
    "facebook",
    "instagram",
    "x",
    "youtube",
    "linkedin",
    "telegram",
    "whatsapp",
  ];

  for (const id of keys) {
    const raw = settings[id].trim();
    if (!raw) continue;
    const meta = SOCIAL_META[id];
    const href = meta.buildHref ? meta.buildHref(raw) : raw;
    if (!href.startsWith("http")) continue;
    links.push({ id, href, label: meta.label });
  }

  return links;
}
