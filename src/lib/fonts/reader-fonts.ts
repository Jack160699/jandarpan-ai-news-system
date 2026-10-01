import {
  DM_Mono,
  Noto_Serif_Devanagari,
  Playfair_Display,
  Source_Serif_4,
} from "next/font/google";

/** Display headlines — preloaded for LCP text stability */
export const playfair = Playfair_Display({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
  adjustFontFallback: true,
  preload: false,
});

/** Body copy — primary reader typeface */
export const sourceSerif = Source_Serif_4({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
  adjustFontFallback: true,
  preload: false,
});

/** Hindi / Chhattisgarhi (Devanagari) */
export const notoDevanagari = Noto_Serif_Devanagari({
  variable: "--font-hindi",
  subsets: ["devanagari"],
  weight: ["400", "600"],
  display: "swap",
  adjustFontFallback: true,
  // Hindi-first product: headline/body text is Devanagari on most pages, so preload it for LCP
  // text stability (previously false → late swap and layout shift on first paint).
  preload: true,
});

/** Meta labels, timestamps */
export const dmMono = DM_Mono({
  variable: "--font-meta",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
  adjustFontFallback: true,
  preload: false,
});

export const readerFontClassName = `${playfair.variable} ${sourceSerif.variable} ${notoDevanagari.variable} ${dmMono.variable} native-scroll min-h-full`;
