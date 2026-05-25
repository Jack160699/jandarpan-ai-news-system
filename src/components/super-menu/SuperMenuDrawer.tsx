"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { triggerHaptic } from "@/lib/mobile/haptics";
import { pickBilingualLabel } from "@/lib/i18n/pick-label";
import { normalizeAppLanguage } from "@/lib/i18n/safe-language";
import { useLanguage } from "@/providers/LanguageProvider";
import { useNavigation } from "@/providers/NavigationProvider";
import { useTenant } from "@/providers/TenantProvider";
import { TenantLogo } from "@/components/tenant/TenantLogo";
import { SuperMenuProfile } from "./SuperMenuProfile";
import { SuperMenuTodayLive } from "./SuperMenuTodayLive";
import { SuperMenuCgRates } from "./SuperMenuCgRates";
import { SuperMenuCategories } from "./SuperMenuCategories";
import { SuperMenuSettings } from "./SuperMenuSettings";

const DRAWER_MS = 280;
const SWIPE_CLOSE_PX = 72;

/** Minimal regional menu — utility-first for CG readers */
export function SuperMenuDrawer() {
  const { menuOpen, closeMenu, startNavigation } = useNavigation();
  const { language } = useLanguage();
  const safeLang = normalizeAppLanguage(language);
  const { tenant } = useTenant();
  const panelRef = useRef<HTMLElement>(null);
  const touchStartX = useRef(0);
  const [mounted, setMounted] = useState(false);
  const [present, setPresent] = useState(false);
  const [animOpen, setAnimOpen] = useState(false);

  const brandName =
    safeLang === "en" ? tenant.branding.nameEn : tenant.branding.nameHi;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (menuOpen) {
      setPresent(true);
      const id = requestAnimationFrame(() => setAnimOpen(true));
      return () => cancelAnimationFrame(id);
    }
    setAnimOpen(false);
    const t = window.setTimeout(() => setPresent(false), DRAWER_MS);
    return () => window.clearTimeout(t);
  }, [menuOpen, mounted]);

  const onNavigate = useCallback(
    (href: string) => {
      triggerHaptic("selection");
      startNavigation(href);
      closeMenu();
    },
    [closeMenu, startNavigation]
  );

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? 0;
  }, []);

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const endX = e.changedTouches[0]?.clientX ?? 0;
      if (endX - touchStartX.current > SWIPE_CLOSE_PX) {
        triggerHaptic("selection");
        closeMenu();
      }
    },
    [closeMenu]
  );

  if (!mounted || !present) return null;

  return createPortal(
    <div
      className={`super-menu super-menu--minimal${animOpen ? " super-menu--open" : ""}`}
      role="presentation"
    >
      <button
        type="button"
        className="super-menu__backdrop"
        aria-label={pickBilingualLabel(safeLang, "Close menu", "मेन्यू बंद करें")}
        onClick={closeMenu}
      />
      <aside
        ref={panelRef}
        className={`super-menu__panel${animOpen ? " super-menu__panel--open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="super-menu-title"
        tabIndex={-1}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <header className="super-menu__head">
          <div className="super-menu__brand">
            <TenantLogo variant="mark" showText={false} className="super-menu__logo" />
            <p id="super-menu-title" className="super-menu__title">
              {brandName}
            </p>
          </div>
          <button
            type="button"
            className="super-menu__close tap-target"
            aria-label={pickBilingualLabel(safeLang, "Close", "बंद")}
            onClick={() => {
              triggerHaptic("selection");
              closeMenu();
            }}
          >
            <X size={20} strokeWidth={2} aria-hidden />
          </button>
        </header>

        <div className="super-menu__scroll">
          <SuperMenuProfile onNavigate={onNavigate} />
          <SuperMenuTodayLive menuOpen={menuOpen} />
          <SuperMenuCgRates menuOpen={menuOpen} />
          <SuperMenuCategories onNavigate={onNavigate} />
          <SuperMenuSettings onNavigate={onNavigate} />
        </div>
      </aside>
    </div>,
    document.body
  );
}

/** @deprecated Use SuperMenuDrawer */
export const MobileNavDrawer = SuperMenuDrawer;
