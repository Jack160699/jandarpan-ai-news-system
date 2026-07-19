"use client";

import Link from "next/link";
import { Bell, LayoutGrid, Search } from "lucide-react";
import { cn } from "@/design-system/utils/cn";
import { Avatar } from "@/design-system/components/Avatar";
import { ThemeToggleButton } from "@/components/navigation/ThemeToggleButton";
import { useLanguage } from "@/providers/LanguageProvider";
import { useNavigation } from "@/providers/NavigationProvider";
import { useReaderAccount } from "@/providers/ReaderAccountProvider";
import { useTenant } from "@/providers/TenantProvider";
import { TenantLogo } from "@/components/tenant/TenantLogo";
import { isNotificationCenterV3Enabled } from "@/features/notifications/config";
import { useShell } from "../AppShell/ShellProvider";
import { useTopBarScrolled } from "../hooks/useTopBarScrolled";
import { TopBarDateline } from "./TopBarDateline";

/**
 * Sticky top bar — 56px mobile, 64px desktop.
 * Blurred background, shadow only while scrolling.
 */
export function TopBar() {
  const { tenant } = useTenant();
  const { language, t } = useLanguage();
  const { displayName, avatarInitial } = useReaderAccount();
  const { startNavigation, toggleMenu, menuOpen } = useNavigation();
  const { openCommandPalette } = useShell();
  const scrolled = useTopBarScrolled();

  const brandName =
    language !== "en" ? tenant.branding.nameHi : tenant.branding.nameEn;
  const initials = avatarInitial || displayName.slice(0, 2);
  const notificationsHref = isNotificationCenterV3Enabled() ? "/notifications" : "/live";

  return (
    <header
      className={cn("jdp-topbar", scrolled && "jdp-topbar--scrolled")}
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
        </Link>

        <TopBarDateline />

        <button
          type="button"
          className="jdp-topbar__search-trigger jds-focus-ring"
          onClick={openCommandPalette}
          aria-label={t.header.search}
          aria-haspopup="dialog"
        >
          <Search size={16} aria-hidden />
          <span>{t.header.search}</span>
          <kbd className="jdp-topbar__kbd">⌘K</kbd>
        </button>

        <div className="jdp-topbar__actions">
          <button
            type="button"
            className="jdp-topbar__btn hidden lg:inline-flex"
            aria-label={t.nav.menu}
            aria-expanded={menuOpen}
            aria-haspopup="dialog"
            onClick={() => toggleMenu()}
          >
            <LayoutGrid size={20} strokeWidth={1.75} aria-hidden />
          </button>
          <button
            type="button"
            className="jdp-topbar__btn lg:hidden"
            aria-label={t.header.search}
            onClick={openCommandPalette}
          >
            <Search size={20} aria-hidden />
          </button>
          <Link
            href={notificationsHref}
            className="jdp-topbar__btn"
            aria-label={t.profile.notifications}
            onClick={() => startNavigation(notificationsHref)}
          >
            <Bell size={20} aria-hidden />
          </Link>
          <ThemeToggleButton compact />
          <Link
            href="/archive"
            className="jdp-topbar__btn hidden sm:inline-flex"
            aria-label="Profile"
            onClick={() => startNavigation("/archive")}
          >
            <Avatar
              size="sm"
              initials={initials}
              alt={displayName}
            />
          </Link>
        </div>
      </div>
    </header>
  );
}
