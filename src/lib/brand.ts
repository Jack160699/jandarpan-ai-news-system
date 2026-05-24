/** Legacy brand constants — prefer tenant config + BRAND_VOICE */
import { BRAND_VOICE } from "@/lib/brand/voice";
import { JAN_DARPAN_CHHATTISGARH_TENANT } from "@/lib/tenant/presets/jan-darpan-chhattisgarh";

export { JAN_DARPAN_BRAND_ASSETS, JAN_DARPAN_LOGO_INTRINSIC } from "@/lib/brand/assets";

const t = JAN_DARPAN_CHHATTISGARH_TENANT;

export const BRAND = {
  nameEn: t.branding.nameEn,
  nameHi: t.branding.nameHi,
  shortNameEn: t.branding.shortNameEn ?? BRAND_VOICE.shortNameEn,
  shortNameHi: t.branding.shortNameHi ?? BRAND_VOICE.shortNameHi,
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
