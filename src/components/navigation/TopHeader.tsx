"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useIsMobile } from "@/hooks/useMediaQuery";
import { useLanguage } from "@/providers/LanguageProvider";
import { useNavigation } from "@/providers/NavigationProvider";
import { useReaderPreferences } from "@/providers/ReaderPreferencesProvider";
import { useTenant } from "@/providers/TenantProvider";
import { TenantLogo } from "@/components/tenant/TenantLogo";
import { HeaderLanguageSwitcher } from "@/components/navigation/HeaderLanguageSwitcher";
import { IconMoon, IconSearch, IconSun } from "./NavIcons";

const SearchOverlay = dynamic(
  () =>
    import("@/components/reader/SearchOverlay").then((m) => ({
      default: m.SearchOverlay,
    })),
  { ssr: false }
);

/** Global top header — logo, locale, utilities */
export function TopHeader() {
  const { tenant, headerLocation } = useTenant();
  const { language, t } = useLanguage();
  const { prefs, toggleTheme, setSearchOpen } = useReaderPreferences();
  const { startNavigation } = useNavigation();
  const isMobile = useIsMobile();
  const showLocalizedBrand = language !== "en";
  const brandName = showLocalizedBrand
    ? tenant.branding.nameHi
    : tenant.branding.nameEn;

  return (
    <>
      <header
        className="site-header app-header site-sticky site-sticky--header newsroom-header newsroom-sticky newsroom-sticky--header"
        data-site-header
      >
        <h1 className="sr-only">{brandName}</h1>
        <div className="site-header__inner newsroom-header__row">
          <Link
            href="/"
            className="site-header__brand newsroom-header__brand tap-target"
            aria-label={brandName}
            onClick={() => startNavigation("/")}
          >
            <TenantLogo
              className="site-header__logo newsroom-header__logo shrink-0"
              variant="banner"
              showText={false}
            />
            {!isMobile ? (
              <div className="site-header__locale newsroom-header__locale">
                <span className="site-header__city newsroom-header__city">
                  {showLocalizedBrand
                    ? headerLocation.cityHi
                    : headerLocation.city}
                </span>
                {headerLocation.condition ? (
                  <span className="site-header__weather newsroom-header__weather">
                    {headerLocation.temp
                      ? `${headerLocation.temp} · `
                      : ""}
                    {headerLocation.condition}
                  </span>
                ) : null}
              </div>
            ) : null}
          </Link>

          <div className="site-header__actions newsroom-header__actions">
            <HeaderLanguageSwitcher compact={isMobile} />

            {isMobile ? (
              <Link
                href="/search"
                className="header-icon-btn tap-target"
                aria-label={t.header.search}
                onClick={() => startNavigation("/search")}
              >
                <IconSearch />
              </Link>
            ) : (
              <>
                <button
                  type="button"
                  className="header-icon-btn tap-target"
                  aria-label={t.header.search}
                  onClick={() => setSearchOpen(true)}
                >
                  <IconSearch />
                </button>

                <button
                  type="button"
                  className="header-icon-btn tap-target"
                  aria-label={
                    prefs.theme === "light"
                      ? t.header.darkMode
                      : t.header.lightMode
                  }
                  onClick={toggleTheme}
                >
                  {prefs.theme === "light" ? <IconMoon /> : <IconSun />}
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <SearchOverlay />
    </>
  );
}
