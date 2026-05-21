import type { Metadata, Viewport } from "next";
import {
  DM_Mono,
  Noto_Serif_Devanagari,
  Playfair_Display,
  Source_Serif_4,
} from "next/font/google";
import { AppChrome } from "@/components/navigation/AppChrome";
import { ThemeScript } from "@/components/reader/ThemeScript";
import { EditorialIntelligenceProvider } from "@/providers/EditorialIntelligenceProvider";
import { LanguageProvider } from "@/providers/LanguageProvider";
import { ReaderPreferencesProvider } from "@/providers/ReaderPreferencesProvider";
import { BRAND } from "@/lib/brand";
import { SITE_URL, organizationJsonLd } from "@/lib/seo";
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
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${BRAND.nameEn} — Chhattisgarh News`,
    template: `%s · ${BRAND.nameEn}`,
  },
  description:
    "CG Bhaskar concept edition — premium regional digital news for Chhattisgarh. Politics, Raipur, Bastar, sports, business, and investigations.",
  keywords: [
    "CG Bhaskar",
    "Chhattisgarh news",
    "Raipur news",
    "Hindi news",
    "regional news India",
  ],
  openGraph: {
    title: `${BRAND.nameEn} — Chhattisgarh News`,
    description: BRAND.taglineEn,
    type: "website",
    locale: "hi_IN",
    siteName: BRAND.nameEn,
  },
  twitter: {
    card: "summary_large_image",
    title: BRAND.nameEn,
    description: BRAND.taglineEn,
  },
  robots: { index: false, follow: false },
  alternates: { canonical: "/" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
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
      className={`${playfair.variable} ${sourceSerif.variable} ${notoDevanagari.variable} ${dmMono.variable} native-scroll h-full`}
    >
      <body className="min-h-full antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationJsonLd()),
          }}
        />
        <ThemeScript />
        <ReaderPreferencesProvider>
          <LanguageProvider>
            <EditorialIntelligenceProvider>
              <AppChrome>{children}</AppChrome>
            </EditorialIntelligenceProvider>
          </LanguageProvider>
        </ReaderPreferencesProvider>
      </body>
    </html>
  );
}
