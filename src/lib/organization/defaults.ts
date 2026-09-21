import { JAN_DARPAN_CHHATTISGARH_TENANT } from "@/lib/tenant/presets/jan-darpan-chhattisgarh";
import type { OrganizationSettings } from "./types";

const CONTACT_EMAIL = "hello@jandarpan.news";

/** Defaults merged under DB overrides — never hardcode in UI components */
export function defaultOrganizationSettings(): OrganizationSettings {
  const t = JAN_DARPAN_CHHATTISGARH_TENANT;
  return {
    organizationName: t.branding.nameEn,
    logoUrl: t.branding.logoUrl,
    email: CONTACT_EMAIL,
    phone: "+91-771-000-0000",
    address: "National Press Club Area",
    city: "New Delhi",
    state: "Delhi",
    facebook: "",
    instagram: "",
    x: "",
    youtube: "",
    linkedin: "",
    telegram: "",
    whatsapp: "",
    googleMapsUrl: "",
    copyrightEmail: CONTACT_EMAIL,
    editorialEmail: CONTACT_EMAIL,
    correctionsEmail: CONTACT_EMAIL,
  };
}
