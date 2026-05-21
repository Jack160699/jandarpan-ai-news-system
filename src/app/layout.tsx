import type { Metadata, Viewport } from "next";
import {
  DM_Mono,
  Noto_Serif_Devanagari,
  Playfair_Display,
  Source_Serif_4,
} from "next/font/google";
import { ThemeScript } from "@/components/reader/ThemeScript";
import { EditorialIntelligenceProvider } from "@/providers/EditorialIntelligenceProvider";
import { ReaderPreferencesProvider } from "@/providers/ReaderPreferencesProvider";
import { SmoothScrollProvider } from "@/providers/SmoothScrollProvider";
import { BRAND } from "@/lib/brand";
import { getThemeColor } from "@/lib/reader-preferences";
import "@/styles/globals.css";

const playfair = Playfair_Display({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

const sourceSerif = Source_Serif_4({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

const notoDevanagari = Noto_Serif_Devanagari({
  variable: "--font-hindi",
  subsets: ["devanagari", "latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const dmMono = DM_Mono({
  variable: "--font-meta",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: `${BRAND.nameEn} — Concept Edition · Future of Regional Journalism`,
  description:
    "Speculative premium redesign concept for CG Bhaskar. Immersive mobile-first editorial experience — presentation only.",
  openGraph: {
    title: "CG Bhaskar — Concept Redesign",
    description:
      "The future evolution of regional digital journalism in Chhattisgarh. Concept showcase.",
    type: "website",
  },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: getThemeColor("light"),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="hi"
      dir="ltr"
      suppressHydrationWarning
      className={`${playfair.variable} ${sourceSerif.variable} ${notoDevanagari.variable} ${dmMono.variable} h-full`}
    >
      <body className="min-h-full antialiased">
        <ThemeScript />
        <ReaderPreferencesProvider>
          <SmoothScrollProvider>
            <EditorialIntelligenceProvider>
              {children}
            </EditorialIntelligenceProvider>
          </SmoothScrollProvider>
        </ReaderPreferencesProvider>
      </body>
    </html>
  );
}
