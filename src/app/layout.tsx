import type { Metadata, Viewport } from "next";
import {
  DM_Mono,
  Noto_Serif_Bengali,
  Noto_Serif_Devanagari,
  Noto_Serif_Tamil,
  Playfair_Display,
  Source_Serif_4,
} from "next/font/google";
import { AppChrome } from "@/components/navigation/AppChrome";
import { ThemeScript } from "@/components/reader/ThemeScript";
import { TenantRoot } from "@/components/tenant/TenantRoot";
import { EditorialIntelligenceProvider } from "@/providers/EditorialIntelligenceProvider";
import { LanguageProvider } from "@/providers/LanguageProvider";
import { ReaderPreferencesProvider } from "@/providers/ReaderPreferencesProvider";
import {
  buildTenantSiteMetadata,
  buildTenantViewport,
} from "@/lib/tenant/metadata";
import { getTenantConfig, stripTenantForClient } from "@/lib/tenant/resolve";
import "@/styles/globals.css";
import "@/styles/monetization.css";

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

const notoBengali = Noto_Serif_Bengali({
  variable: "--font-bengali",
  subsets: ["bengali", "latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const notoTamil = Noto_Serif_Tamil({
  variable: "--font-tamil",
  subsets: ["tamil", "latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const dmMono = DM_Mono({
  variable: "--font-meta",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

const fontClassName = `${playfair.variable} ${sourceSerif.variable} ${notoDevanagari.variable} ${notoBengali.variable} ${notoTamil.variable} ${dmMono.variable} native-scroll h-full`;

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getTenantConfig();
  return buildTenantSiteMetadata(tenant);
}

export async function generateViewport(): Promise<Viewport> {
  const tenant = await getTenantConfig();
  return {
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
    themeColor: buildTenantViewport(tenant).themeColor,
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const tenant = await getTenantConfig();
  const htmlLang = tenant.newsroom.defaultLanguage === "en" ? "en" : "hi";

  return (
    <html
      lang={htmlLang}
      dir="ltr"
      data-tenant={tenant.slug}
      suppressHydrationWarning
      className={fontClassName}
    >
      <body className="min-h-full antialiased text-[var(--ink-primary)]">
        <ThemeScript />
        <TenantRoot tenant={stripTenantForClient(tenant)}>
          <ReaderPreferencesProvider>
            <LanguageProvider
              defaultLanguage={tenant.newsroom.defaultLanguage}
              enabledLanguages={tenant.newsroom.enabledLanguages}
            >
              <EditorialIntelligenceProvider>
                <AppChrome>{children}</AppChrome>
              </EditorialIntelligenceProvider>
            </LanguageProvider>
          </ReaderPreferencesProvider>
        </TenantRoot>
      </body>
    </html>
  );
}
