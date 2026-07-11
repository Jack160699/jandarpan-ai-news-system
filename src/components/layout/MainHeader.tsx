"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { LayoutGrid } from "lucide-react";
import { useHeaderScrolled } from "@/hooks/useHeaderScrolled";
import { useIsMobile } from "@/design-system/hooks/useMediaQuery";
import { useLanguage } from "@/providers/LanguageProvider";
import { useNavigation } from "@/providers/NavigationProvider";
import { useReaderPreferences } from "@/providers/ReaderPreferencesProvider";
import { useTenant } from "@/providers/TenantProvider";
import { ThemeToggleButton } from "@/components/navigation/ThemeToggleButton";
import { IconBell, IconSearch } from "@/components/navigation/NavIcons";
import { TenantLogo } from "@/components/tenant/TenantLogo";
import { isNotificationCenterV3Enabled } from "@/features/notifications/config";

const SearchOverlay = dynamic(
  () =>
    import("@/components/reader/SearchOverlay").then((m) => ({
      default: m.SearchOverlay,
    })),
  { ssr: false }
);

/**
 * @deprecated RC1-004 — replaced by JDP-002 TopBar via AppShell.
 * Retained for one-commit rollback. See docs/RC1-004-APPSHELL-INTEGRATION-REPORT.md
 */
export function MainHeader() {
  const { tenant, headerLocation } = useTenant();
  const { language, t } = useLanguage();
  const { setSearchOpen, searchOpen } = useReaderPreferences();
  const { startNavigation, toggleMenu, menuOpen } = useNavigation();
  const isMobile = useIsMobile();
  const scrolled = useHeaderScrolled();
  const brandName =
    language !== "en" ? tenant.branding.nameHi : tenant.branding.nameEn;
  const notificationsHref = isNotificationCenterV3Enabled() ? "/notifications" : "/live";

  return (
    <>
      <header
        className={`main-header app-header${scrolled ? " main-header--scrolled" : ""}${isMobile ? " main-header--mobile-premium" : ""}`}
      >
        <h1 className="sr-only">{brandName}</h1>
        <div className="main-header__inner">
          <Link
            href="/"
            className="main-header__brand"
            aria-label={brandName}
            onClick={() => startNavigation("/")}
          >
            <TenantLogo
              variant="banner"
              showText={false}
              className="main-header__logo"
            />
            {!isMobile ? (
              <div className="main-header__locale">
                <span className="main-header__city">
                  {language !== "en"
                    ? headerLocation.cityHi
                    : headerLocation.city}
                </span>
                {headerLocation.condition ? (
                  <span className="main-header__weather">
                    {headerLocation.temp ? `${headerLocation.temp} · ` : ""}
                    {headerLocation.condition}
                  </span>
                ) : null}
              </div>
            ) : null}
          </Link>

          <div className="main-header__actions">
            {!isMobile ? (
              <button
                type="button"
                className="main-header__btn main-header__btn--menu tap-target tap-press"
                aria-label={t.nav.menu}
                aria-expanded={menuOpen}
                aria-haspopup="dialog"
                onClick={() => toggleMenu()}
              >
                <LayoutGrid size={20} strokeWidth={1.75} aria-hidden />
              </button>
            ) : null}
            <button
              type="button"
              className="main-header__btn main-header__btn--search tap-target tap-press"
              aria-label={t.header.search}
              aria-haspopup="dialog"
              aria-expanded={searchOpen}
              onClick={() => setSearchOpen(true)}
            >
              <IconSearch />
            </button>
            <Link
              href={notificationsHref}
              className="main-header__btn main-header__btn--bell tap-target tap-press"
              aria-label={t.profile.notifications}
              onClick={() => startNavigation(notificationsHref)}
            >
              <IconBell />
              <span className="main-header__badge" aria-hidden />
            </Link>
            <ThemeToggleButton compact />
          </div>
        </div>
      </header>

      <SearchOverlay />
    </>
  );
}
