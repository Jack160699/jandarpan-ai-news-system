"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { triggerHaptic } from "@/lib/mobile/haptics";
import { DRAWER_MS } from "@/lib/navigation/transition-config";
import { pickBilingualLabel } from "@/lib/i18n/pick-label";
import { normalizeAppLanguage } from "@/lib/i18n/safe-language";
import { useLanguage } from "@/providers/LanguageProvider";
import { useNavigation } from "@/providers/NavigationProvider";
import { useTenant } from "@/providers/TenantProvider";
import { TenantLogo } from "@/components/tenant/TenantLogo";
import { SuperMenuProfile } from "./SuperMenuProfile";
import { SuperMenuTodayLive } from "./SuperMenuTodayLive";
import { SuperMenuCgRates } from "./SuperMenuCgRates";
import { SuperMenuIplScores } from "./SuperMenuIplScores";
import { SuperMenuSettings } from "./SuperMenuSettings";

const SWIPE_CLOSE_PX = 72;
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Minimal regional menu — compact fintech-style drawer */
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
    if (!animOpen || !panelRef.current) return;
    const panel = panelRef.current;
    const closeBtn = panel.querySelector<HTMLElement>(".super-menu__close");
    closeBtn?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Tab") {
        const nodes = Array.from(
          panel.querySelectorAll<HTMLElement>(FOCUSABLE)
        ).filter((el) => !el.closest("[aria-hidden='true']"));
        if (nodes.length === 0) return;
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    panel.addEventListener("keydown", onKeyDown);
    return () => panel.removeEventListener("keydown", onKeyDown);
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
        <header className="super-menu__head super-menu__head--brand">
          <button
            type="button"
            className="super-menu__close super-menu__close--float tap-target"
            aria-label={pickBilingualLabel(safeLang, "Close", "बंद")}
            onClick={() => {
              triggerHaptic("selection");
              closeMenu();
            }}
          >
            <X size={17} strokeWidth={2.25} aria-hidden />
          </button>
          <div className="super-menu__head-center">
            <TenantLogo
              variant="banner"
              showText={false}
              className="super-menu__logo-hero"
            />
            <p className="super-menu__subtitle">
              {pickBilingualLabel(
                safeLang,
                "AI Regional Newsroom",
                "AI क्षेत्रीय न्यूज़रूम"
              )}
            </p>
            <span id="super-menu-title" className="sr-only">
              {brandName}
            </span>
          </div>
        </header>

        <div className="super-menu__scroll">
          <SuperMenuProfile onNavigate={onNavigate} />
          <SuperMenuTodayLive menuOpen={menuOpen} />
          <SuperMenuCgRates menuOpen={menuOpen} />
          <SuperMenuIplScores menuOpen={menuOpen} />
          <SuperMenuSettings onNavigate={onNavigate} />
        </div>
      </aside>
    </div>,
    document.body
  );
}

/** @deprecated Use SuperMenuDrawer */
export const MobileNavDrawer = SuperMenuDrawer;
