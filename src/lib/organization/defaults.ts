import { JAN_DARPAN_CHHATTISGARH_TENANT } from "@/lib/tenant/presets/jan-darpan-chhattisgarh";
import { CANONICAL_IDENTITY } from "@/lib/compliance/canonical-identity";
import type { OrganizationSettings } from "./types";

const CONTACT_EMAIL = CANONICAL_IDENTITY.businessAndGeneral.editorialEmail;

/** Defaults merged under DB overrides — never hardcode in UI components */
export function defaultOrganizationSettings(): OrganizationSettings {
  const t = JAN_DARPAN_CHHATTISGARH_TENANT;
  return {
    organizationName: t.branding.nameEn,
    logoUrl: t.branding.logoUrl,
    email: CONTACT_EMAIL,
    phone: CANONICAL_IDENTITY.grievanceOfficer.primaryPhone,
    address: CANONICAL_IDENTITY.legalEntity.registeredOffice.addressLine + ", " + CANONICAL_IDENTITY.legalEntity.registeredOffice.landmark,
    city: CANONICAL_IDENTITY.legalEntity.registeredOffice.city,
    state: CANONICAL_IDENTITY.legalEntity.registeredOffice.state,
    facebook: "",
    instagram: "",
    x: "",
    youtube: "",
    linkedin: "",
    telegram: "",
    whatsapp: `https://wa.me/${CANONICAL_IDENTITY.grievanceOfficer.primaryWhatsAppClean}`,
    googleMapsUrl: "",
    copyrightEmail: CANONICAL_IDENTITY.grievanceOfficer.email,
    editorialEmail: CONTACT_EMAIL,
    correctionsEmail: CANONICAL_IDENTITY.grievanceOfficer.email,
  };
}
