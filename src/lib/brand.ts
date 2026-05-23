/** Legacy brand constants — prefer tenant config + BRAND_VOICE */
import { BRAND_VOICE } from "@/lib/brand/voice";
import { HAMAR_CHHATTISGARH_TENANT } from "@/lib/tenant/presets/hamar-chhattisgarh";

const t = HAMAR_CHHATTISGARH_TENANT;

export const BRAND = {
  nameEn: t.branding.nameEn,
  nameHi: t.branding.nameHi,
  taglineEn: t.branding.taglineEn,
  taglineHi: t.branding.taglineHi,
  conceptLabel: t.branding.conceptLabel ?? BRAND_VOICE.promiseEn,
  founded: 2024,
  volume: "I",
  editionNumber: 1,
  regionalEdition: "Chhattisgarh",
  registry: "Independent regional publisher · India",
  press: BRAND_VOICE.pressLineEn,
  voice: BRAND_VOICE,
};
