"use client";

import Link from "next/link";
import { Menu, Search } from "lucide-react";
import { useLanguage } from "@/providers/LanguageProvider";
import { useNavigation } from "@/providers/NavigationProvider";
import { useReaderPreferences } from "@/providers/ReaderPreferencesProvider";
import { useTenant } from "@/providers/TenantProvider";
import { TenantLogo } from "@/components/tenant/TenantLogo";
import { CategoryRail } from "./CategoryRail";
import { GlobalLiveBar } from "./GlobalLiveBar";
import { HeaderStatusStrip } from "./HeaderStatusStrip";

/** Brand/actions, utility information, linked live updates and category rail. */
export function TopBar() {
  const { tenant } = useTenant();
  const { language, t } = useLanguage();
  const { startNavigation, toggleMenu } = useNavigation();
  const { setSearchOpen } = useReaderPreferences();
  const brandName = language !== "en" ? tenant.branding.nameHi : tenant.branding.nameEn;

  return (
    <header className="jdp-topbar" role="banner">
      <div className="jdp-topbar__inner">
        <Link
          href="/"
          className="jdp-topbar__brand"
          aria-label={brandName}
          onClick={() => startNavigation("/")}
        >
          <TenantLogo variant="banner" showText={false} />
        </Link>

        <div className="jdp-topbar__actions">
          <button
            type="button"
            className="jdp-topbar__btn"
            aria-label={language === "en" ? "Search news" : "समाचार खोजें"}
            onClick={() => setSearchOpen(true)}
          >
            <Search size={20} aria-hidden />
          </button>
          <button
            type="button"
            className="jdp-topbar__btn"
            aria-label={t.nav.menu}
            onClick={toggleMenu}
          >
            <Menu size={21} aria-hidden />
          </button>
        </div>
      </div>
      <HeaderStatusStrip />
      <GlobalLiveBar />
      <CategoryRail />
    </header>
  );
}
