"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import { X, Sparkles } from "lucide-react";
import { triggerHaptic } from "@/lib/mobile/haptics";
import { pickBilingualLabel } from "@/lib/i18n/pick-label";
import { normalizeAppLanguage } from "@/lib/i18n/safe-language";
import { useLanguage } from "@/providers/LanguageProvider";
import { useNavigation } from "@/providers/NavigationProvider";
import { useTenant } from "@/providers/TenantProvider";
import { TenantLogo } from "@/components/tenant/TenantLogo";
import { SuperMenuProfile } from "./SuperMenuProfile";
import { SuperMenuFeed } from "./SuperMenuFeed";
import { SuperMenuUtilities } from "./SuperMenuUtilities";
import { SuperMenuCategories } from "./SuperMenuCategories";
import { SuperMenuSettings } from "./SuperMenuSettings";

const SuperMenuMarket = dynamic(
  () => import("./SuperMenuMarket").then((m) => ({ default: m.SuperMenuMarket })),
  { ssr: false, loading: () => <div className="sm-section sm-section--skeleton" aria-hidden /> }
);

const DRAWER_MS = 320;
const SWIPE_CLOSE_PX = 72;

/** Premium AI-powered super menu — client-only portal */
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

  useEffect(() => {
    if (!animOpen) return;
    panelRef.current?.focus();
  }, [animOpen]);

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
      className={`super-menu${animOpen ? " super-menu--open" : ""}`}
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
            <div>
              <p id="super-menu-title" className="super-menu__title">
                {brandName}
              </p>
              <p className="super-menu__kicker">
                <Sparkles size={12} aria-hidden />
                {pickBilingualLabel(safeLang, "AI News Hub", "AI न्यूज़ हब")}
              </p>
            </div>
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
          <SuperMenuFeed onNavigate={onNavigate} />
          {menuOpen ? <SuperMenuMarket /> : null}
          <SuperMenuUtilities onNavigate={onNavigate} />
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
