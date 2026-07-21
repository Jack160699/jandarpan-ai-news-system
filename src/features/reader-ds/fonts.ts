import { Mukta, Tiro_Devanagari_Hindi } from "next/font/google";

/**
 * Reader Design System typefaces.
 *
 * - Mukta — UI, labels, metadata (weights 300–800)
 * - Tiro Devanagari Hindi — masthead wordmark / brand
 *
 * Noto Serif Devanagari (headlines & body) is already loaded globally as
 * `--font-hindi` in `src/lib/fonts/reader-fonts.ts` and is reused here.
 */

export const mukta = Mukta({
  variable: "--jd-font-ui",
  subsets: ["devanagari", "latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
  adjustFontFallback: true,
  preload: false,
});

export const tiroDevanagari = Tiro_Devanagari_Hindi({
  variable: "--jd-font-brand",
  subsets: ["devanagari", "latin"],
  weight: ["400"],
  display: "swap",
  adjustFontFallback: true,
  preload: false,
});

/** Combined variable class applied on the reader-DS root wrapper. */
export const readerDsFontClassName = `${mukta.variable} ${tiroDevanagari.variable}`;
