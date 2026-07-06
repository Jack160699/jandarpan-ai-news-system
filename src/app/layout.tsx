import type { Metadata, Viewport } from "next";
import { AppChrome } from "@/components/navigation/AppChrome";
import { LanguageGateScript } from "@/components/reader/LanguageGateScript";
import { ThemeScript } from "@/components/reader/ThemeScript";
import { TenantRoot } from "@/components/tenant/TenantRoot";
import { readerFontClassName } from "@/lib/fonts/reader-fonts";
import { LanguageProvider } from "@/providers/LanguageProvider";
import { ReaderPreferencesProvider } from "@/providers/ReaderPreferencesProvider";
import {
  buildTenantSiteMetadata,
  buildTenantViewport,
} from "@/lib/tenant/metadata";
import { getLanguageConfig } from "@/lib/i18n/languages";
import { getServerLanguageChosen, getServerReaderLanguage } from "@/lib/i18n/server-language";
import { fetchOrganizationSettings } from "@/lib/organization/settings";
import { getTenantConfig, stripTenantForClient } from "@/lib/tenant/resolve";
import "@/styles/globals.css";
import "@/styles/monetization.css";

const GOOGLE_SITE_VERIFICATION =
  "oqiFouZAWNqKNdef92A7wMcF-xaLQO9d-YnT-dNIpm4";

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getTenantConfig();
  return {
    ...buildTenantSiteMetadata(tenant),
    verification: {
      google: GOOGLE_SITE_VERIFICATION,
    },
  };
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
  const organization = await fetchOrganizationSettings();
  const readerLang = await getServerReaderLanguage();
  const languageChosen = await getServerLanguageChosen();
  const langCfg = getLanguageConfig(readerLang);

  return (
    <html
      lang={langCfg.hreflang}
      dir={langCfg.script === "arabic" ? "rtl" : "ltr"}
      data-tenant={tenant.slug}
      data-language={readerLang}
      data-script={langCfg.scriptAttr}
      suppressHydrationWarning
      className={readerFontClassName}
    >
      <body className="min-h-full antialiased text-[var(--ink-primary)]">
        <ThemeScript />
        <LanguageGateScript />
        <TenantRoot tenant={stripTenantForClient(tenant)} organization={organization}>
          <ReaderPreferencesProvider>
            <LanguageProvider
              defaultLanguage={readerLang}
              enabledLanguages={tenant.newsroom.enabledLanguages}
              initialLanguageChosen={languageChosen}
            >
              <AppChrome>{children}</AppChrome>
            </LanguageProvider>
          </ReaderPreferencesProvider>
        </TenantRoot>
      </body>
    </html>
  );
}
