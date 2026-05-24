"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { MOBILE_MENU_NAV } from "@/lib/navigation/menu";
import { resolveNavHref } from "@/lib/navigation/active";
import { triggerHaptic } from "@/lib/mobile/haptics";
import { useLanguage } from "@/providers/LanguageProvider";
import { useNavigation } from "@/providers/NavigationProvider";
import { useTenant } from "@/providers/TenantProvider";
import { TenantLogo } from "@/components/tenant/TenantLogo";

export function MobileNavDrawer() {
  const { menuOpen, closeMenu, pathname, startNavigation } = useNavigation();
  const { t, language } = useLanguage();
  const { tenant } = useTenant();
  const panelRef = useRef<HTMLElement>(null);
  const brandName =
    language === "en" ? tenant.branding.nameEn : tenant.branding.nameHi;

  useEffect(() => {
    if (!menuOpen) return;
    panelRef.current?.focus();
  }, [menuOpen]);

  if (typeof document === "undefined" || !menuOpen) return null;

  const onNavigate = (href: string) => {
    triggerHaptic("selection");
    startNavigation(href);
    closeMenu();
  };

  return createPortal(
    <div
      className={`mobile-nav-drawer${menuOpen ? " mobile-nav-drawer--open" : ""}`}
      role="presentation"
    >
      <button
        type="button"
        className="mobile-nav-drawer__backdrop"
        aria-label="Close menu"
        onClick={closeMenu}
      />
      <aside
        ref={panelRef}
        className="mobile-nav-drawer__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mobile-nav-drawer-title"
        tabIndex={-1}
      >
        <header className="mobile-nav-drawer__head">
          <div className="mobile-nav-drawer__brand">
            <TenantLogo variant="mark" showText={false} className="mobile-nav-drawer__logo" />
            <div>
              <p id="mobile-nav-drawer-title" className="mobile-nav-drawer__title">
                {brandName}
              </p>
              <p className="mobile-nav-drawer__subtitle">{t.nav.categoriesTitle}</p>
            </div>
          </div>
          <button
            type="button"
            className="mobile-nav-drawer__close tap-target"
            aria-label="Close menu"
            onClick={() => {
              triggerHaptic("selection");
              closeMenu();
            }}
          >
            <X size={20} strokeWidth={2} aria-hidden />
          </button>
        </header>

        <nav className="mobile-nav-drawer__body" aria-label={t.nav.menu}>
          <ul className="mobile-nav-drawer__grid">
            {MOBILE_MENU_NAV.map((item) => {
              const label = t.nav[item.labelKey];
              const href = resolveNavHref(item.href, pathname);
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname === item.href ||
                    pathname.startsWith(`${item.href}/`);
              const toneClass =
                item.tone === "live"
                  ? " mobile-nav-drawer__item--live"
                  : item.tone === "utility"
                    ? " mobile-nav-drawer__item--utility"
                    : "";

              return (
                <li key={item.id}>
                  <Link
                    href={href}
                    className={`mobile-nav-drawer__item tap-target${toneClass}${active ? " is-active" : ""}`}
                    aria-current={active ? "page" : undefined}
                    onClick={() => onNavigate(href)}
                  >
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>
    </div>,
    document.body
  );
}
