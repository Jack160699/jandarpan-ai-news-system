/** Admin-editable organization & publisher settings (platform_config.organization_settings) */

export type OrganizationSettings = {
  organizationName: string;
  logoUrl: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  facebook: string;
  instagram: string;
  x: string;
  youtube: string;
  linkedin: string;
  telegram: string;
  whatsapp: string;
  googleMapsUrl: string;
  copyrightEmail: string;
  editorialEmail: string;
  correctionsEmail: string;
};

export type OrganizationSocialId =
  | "facebook"
  | "instagram"
  | "x"
  | "youtube"
  | "linkedin"
  | "telegram"
  | "whatsapp";

export type OrganizationSocialLink = {
  id: OrganizationSocialId;
  href: string;
  label: string;
};
