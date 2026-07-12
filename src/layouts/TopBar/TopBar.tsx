"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MapPin, Search } from "lucide-react";
import { cn } from "@/design-system/utils/cn";
import { Avatar } from "@/design-system/components/Avatar";
import { useLanguage } from "@/providers/LanguageProvider";
import { useNavigation } from "@/providers/NavigationProvider";
import { usePlace } from "@/providers/PlaceProvider";
import { useReaderAccount } from "@/providers/ReaderAccountProvider";
import { useTenant } from "@/providers/TenantProvider";
import { TenantLogo } from "@/components/tenant/TenantLogo";
import { useHeaderCollapse } from "../hooks/useHeaderCollapse";
import { useTopBarScrolled } from "../hooks/useTopBarScrolled";

/**
 * Global header — 56px rest / 44px collapsed on scroll-down, restores on
 * scroll-up. Wordmark, place chip, search, avatar. No menu icon, no bell,
 * no theme toggle (removed per Atlas Phase 1).
 */
export function TopBar() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const { tenant } = useTenant();
  const { language, t } = useLanguage();
  const place = usePlace();
  const { displayName, avatarInitial } = useReaderAccount();
  const { startNavigation } = useNavigation();
  const scrolled = useTopBarScrolled();
  const collapsed = useHeaderCollapse();

  const brandName =
    language !== "en" ? tenant.branding.nameHi : tenant.branding.nameEn;
  const initials = avatarInitial || displayName.slice(0, 2);
  const hasNotification = false; // no live unread-notification signal exists yet

  return (
    <header
      className={cn(
        "jdp-topbar",
        scrolled && "jdp-topbar--scrolled",
        collapsed && "jdp-topbar--collapsed"
      )}
      role="banner"
    >
      <div className="jdp-topbar__inner">
        <Link
          href="/"
          className="jdp-topbar__brand"
          aria-label={brandName}
          onClick={() => startNavigation("/")}
        >
          <TenantLogo variant="banner" showText={false} />
          <span className="jdp-topbar__wordmark" aria-hidden={collapsed}>
            {brandName}
          </span>
        </Link>

        {!isHome ? (
          <Link
            href="/places"
            className="jdp-topbar__place jds-focus-ring"
            onClick={() => startNavigation("/places")}
          >
            <MapPin size={14} aria-hidden />
            <span>{place.shortName}</span>
          </Link>
        ) : null}

        <div className="jdp-topbar__actions">
          <Link
            href="/search"
            className="jdp-topbar__btn"
            aria-label={t.header.search}
            onClick={() => startNavigation("/search")}
          >
            <Search size={20} aria-hidden />
          </Link>
          <Link
            href="/you"
            className="jdp-topbar__avatar-link jds-focus-ring"
            aria-label={displayName}
            onClick={() => startNavigation("/you")}
          >
            <Avatar size="sm" initials={initials} alt={displayName} />
            {hasNotification ? (
              <span className="jdp-topbar__dot" aria-hidden />
            ) : null}
          </Link>
        </div>
      </div>
    </header>
  );
}
