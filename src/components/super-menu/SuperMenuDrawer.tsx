"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, useReducedMotion } from "framer-motion";
import { X, Sparkles } from "lucide-react";
import { triggerHaptic } from "@/lib/mobile/haptics";
import { pickBilingualLabel } from "@/lib/i18n/pick-label";
import { useLanguage } from "@/providers/LanguageProvider";
import { useNavigation } from "@/providers/NavigationProvider";
import { useTenant } from "@/providers/TenantProvider";
import { TenantLogo } from "@/components/tenant/TenantLogo";
import { SuperMenuProfile } from "./SuperMenuProfile";
import { SuperMenuFeed } from "./SuperMenuFeed";
import { SuperMenuMarket } from "./SuperMenuMarket";
import { SuperMenuUtilities } from "./SuperMenuUtilities";
import { SuperMenuCategories } from "./SuperMenuCategories";
import { SuperMenuSettings } from "./SuperMenuSettings";

const DRAWER_MS = 320;
const SWIPE_CLOSE_PX = 72;

/** Premium AI-powered super menu — replaces legacy category grid */
export function SuperMenuDrawer() {
  const { menuOpen, closeMenu, startNavigation } = useNavigation();
  const { language } = useLanguage();
  const { tenant } = useTenant();
  const panelRef = useRef<HTMLElement>(null);
  const touchStartX = useRef(0);
  const [present, setPresent] = useState(false);
  const [animOpen, setAnimOpen] = useState(false);
  const reduceMotion = useReducedMotion();

  const brandName =
    language === "en" ? tenant.branding.nameEn : tenant.branding.nameHi;

  useEffect(() => {
    if (menuOpen) {
      setPresent(true);
      const id = requestAnimationFrame(() => setAnimOpen(true));
      return () => cancelAnimationFrame(id);
    }
    setAnimOpen(false);
    const t = window.setTimeout(() => setPresent(false), DRAWER_MS);
    return () => window.clearTimeout(t);
  }, [menuOpen]);

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

  if (typeof document === "undefined" || !present) return null;

  return createPortal(
    <div
      className={`super-menu${animOpen ? " super-menu--open" : ""}`}
      role="presentation"
    >
      <button
        type="button"
        className="super-menu__backdrop"
        aria-label={pickBilingualLabel(language, "Close menu", "मेन्यू बंद करें")}
        onClick={closeMenu}
      />
      <motion.aside
        ref={panelRef}
        className="super-menu__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="super-menu-title"
        tabIndex={-1}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        initial={reduceMotion ? false : { x: "100%" }}
        animate={{ x: animOpen ? 0 : "100%" }}
        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
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
                {pickBilingualLabel(
                  language,
                  "AI News Hub",
                  "AI न्यूज़ हब"
                )}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="super-menu__close tap-target"
            aria-label={pickBilingualLabel(language, "Close", "बंद")}
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
          <SuperMenuMarket />
          <SuperMenuUtilities onNavigate={onNavigate} />
          <SuperMenuCategories onNavigate={onNavigate} />
          <SuperMenuSettings onNavigate={onNavigate} />
        </div>
      </motion.aside>
    </div>,
    document.body
  );
}

/** @deprecated Use SuperMenuDrawer */
export const MobileNavDrawer = SuperMenuDrawer;
