import type { Dictionary } from "../types";
import { hi } from "./hi";

/** Urdu UI — full dictionary falls back to Hindi via languages config */
export const ur: Dictionary = {
  ...hi,
  gate: {
    editionLabel: "آج کا ایڈیشن",
    title: "اپنی زبان منتخب کریں",
    subtitle: "چھتیس گڑھ کی خبریں اپنی زبان میں پڑھیں",
    description: "ایڈیشن آپ کی پسند کی زبان میں کھلے گی۔ مینو سے کبھی بھی تبدیل کریں۔",
    confirm: "جاری رکھیں",
  },
};
