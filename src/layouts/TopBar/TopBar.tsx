"use client";

import Link from "next/link";
import { ChevronDown, MapPin, Menu } from "lucide-react";
import { useLanguage } from "@/providers/LanguageProvider";
import { useNavigation } from "@/providers/NavigationProvider";
import { usePlace } from "@/providers/PlaceProvider";
import { useTenant } from "@/providers/TenantProvider";
import { TenantLogo } from "@/components/tenant/TenantLogo";
import { HeaderStatusStrip } from "./HeaderStatusStrip";
import { GlobalLiveBar } from "./GlobalLiveBar";
import { requestDistrictPicker } from "../DistrictModal/events";

/**
 * Stable global header — identity, local edition, date/time/weather and menu.
 * Search belongs to the continuous live-news row directly below.
 */
export function TopBar() {
  const { tenant } = useTenant();
  const { language, t } = useLanguage();
  const place = usePlace();
  const { startNavigation, toggleMenu } = useNavigation();

  const brandName =
    language !== "en" ? tenant.branding.nameHi : tenant.branding.nameEn;
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

        <button
          type="button"
          className="jdp-topbar__place jds-focus-ring"
          onClick={requestDistrictPicker}
          aria-label={language === "en" ? `Change district, ${place.name} selected` : `जिला बदलें, ${place.name} चुना गया है`}
        >
          <MapPin size={14} aria-hidden />
          <span>{place.shortName}</span>
          <ChevronDown size={13} aria-hidden />
        </button>

        <HeaderStatusStrip />

        <div className="jdp-topbar__actions">
          <button
            type="button"
            className="jdp-topbar__btn"
            aria-label={t.nav.menu}
            onClick={toggleMenu}
          >
            <Menu size={20} aria-hidden />
          </button>
        </div>
      </div>
      <GlobalLiveBar />
    </header>
  );
}
