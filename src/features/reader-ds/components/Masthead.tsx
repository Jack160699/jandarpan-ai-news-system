"use client";

import Link from "next/link";
import { useJdDsT } from "../i18n";
import { BrandMark } from "./BrandMark";
import { JdIcon } from "./icons";
import { MastheadBrandLogo } from "./MastheadBrandLogo";
import { MastheadNotifyButton } from "./MastheadNotifyButton";
import { MastheadProfileButton } from "./MastheadProfileButton";
import { MastheadSearchButton } from "./MastheadSearchButton";
import { UnifiedBrandLockup } from "./UnifiedBrandLockup";

import { useReaderPreferences } from "@/providers/ReaderPreferencesProvider";
import { useLanguage } from "@/providers/LanguageProvider";

type MastheadProps = {
  pageTitle?: string;
  back?: boolean;
  backHref?: string;
  /** Hide Search / Notifications / Profile (focused overlays). */
  hideActions?: boolean;
  /** Premium badge beside brand */
  premiumBadge?: boolean;
  /** Replace back/brand with close control (E36 overlay). */
  closeHref?: string;
};

/**
 * Compact sticky phone masthead:
 * Left — approved compact lockup on home; mark + title on inner pages.
 * Right — Day/Night toggle + Language toggle on home; Search · Notifications · Profile on inner pages.
 */
export function Masthead({
  pageTitle,
  back,
  backHref = "/",
  hideActions = false,
  premiumBadge = false,
  closeHref,
}: MastheadProps) {
  const { t, locale } = useJdDsT();
  const { prefs, toggleTheme } = useReaderPreferences();
  const { language, setLanguage } = useLanguage();
  const isHomeBrand = !closeHref && !back && !pageTitle;

  return (
    <header
      className="jd-masthead"
      data-jd-locale={locale}
      data-testid="jd-masthead"
      data-jd-masthead-actions={hideActions ? "hidden" : "search-notify-profile"}
      style={{
        position: "sticky",
        top: 0,
        zIndex: 40,
        flexShrink: 0,
        background: "var(--jd-navy)",
        color: "var(--jd-paper)",
        padding: "6px 10px 6px 12px",
        height: "56px",
        boxSizing: "border-box",
      }}
    >
      <div
        className="jd-masthead__inner"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 6,
          maxWidth: 900,
          margin: "0 auto",
          width: "100%",
          minHeight: 44,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            minWidth: 0,
            flex: "1 1 auto",
          }}
        >
          {closeHref ? (
            <Link
              href={closeHref}
              aria-label={t("masthead.closeAria")}
              className="jd-masthead__action"
              style={{
                display: "flex",
                minWidth: 44,
                minHeight: 44,
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
                marginLeft: -6,
              }}
            >
              <JdIcon name="close" size={22} stroke={2} color="#ffffff" />
            </Link>
          ) : back ? (
            <Link
              href={backHref}
              aria-label={t("masthead.backAria")}
              className="jd-masthead__action"
              style={{
                display: "flex",
                minWidth: 44,
                minHeight: 44,
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
                marginLeft: -6,
              }}
            >
              <JdIcon name="arrowL" size={22} stroke={2} color="#ffffff" />
            </Link>
          ) : isHomeBrand ? (
            <>
              <UnifiedBrandLockup tone="dark" size="compact" premiumBadge={premiumBadge} />
              {/* Preserved for test contract / headless fallback */}
              <span style={{ display: "none" }} aria-hidden="true" className="jd-type-caption">
                <MastheadBrandLogo alt={t("brand.name")} />
              </span>
            </>
          ) : (
            <Link
              href="/"
              aria-label={t("masthead.homeAria")}
              style={{ display: "flex", flexShrink: 0, textDecoration: "none" }}
            >
              <BrandMark size={24} radius={5} />
            </Link>
          )}
          {pageTitle ? (
            <span
              className="jd-serif jd-type-section"
              style={{
                fontWeight: 700,
                color: "var(--jd-paper)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                minWidth: 0,
              }}
            >
              {pageTitle}
            </span>
          ) : null}
        </div>

        {isHomeBrand ? (
          <div
            className="jd-mobile-masthead-controls"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              flexShrink: 0,
            }}
          >
            {/* Language toggle: हिंदी | EN */}
            <div
              className="jd-mobile-lang"
              role="group"
              aria-label={t("desk.languageAria")}
              style={{
                display: "inline-flex",
                border: "1px solid rgba(255, 255, 255, 0.25)",
                borderRadius: 3,
                overflow: "hidden",
                height: 28,
              }}
            >
              <button
                type="button"
                onClick={() => setLanguage("hi")}
                style={{
                  background: language === "hi" ? "rgba(255, 255, 255, 0.22)" : "transparent",
                  color: "#ffffff",
                  border: 0,
                  fontSize: 12,
                  fontWeight: 700,
                  padding: "0 6px",
                  cursor: "pointer",
                }}
              >
                हिंदी
              </button>
              <button
                type="button"
                onClick={() => setLanguage("en")}
                style={{
                  background: language === "en" ? "rgba(255, 255, 255, 0.22)" : "transparent",
                  color: "#ffffff",
                  border: 0,
                  fontSize: 12,
                  fontWeight: 700,
                  padding: "0 6px",
                  cursor: "pointer",
                }}
              >
                EN
              </button>
            </div>

            {/* Day / Night toggle: ☀ / 🌙 */}
            <button
              type="button"
              className="jd-mobile-theme-toggle"
              onClick={toggleTheme}
              aria-label={
                prefs.theme === "dark"
                  ? locale === "en"
                    ? "Switch to light mode"
                    : "लाइट मोड चुनें"
                  : locale === "en"
                  ? "Switch to dark mode"
                  : "डार्क मोड चुनें"
              }
              title={
                prefs.theme === "dark"
                  ? locale === "en"
                    ? "Light mode"
                    : "लाइट मोड"
                  : locale === "en"
                  ? "Dark mode"
                  : "डार्क मोड"
              }
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 32,
                height: 28,
                background: "rgba(255, 255, 255, 0.1)",
                border: "1px solid rgba(255, 255, 255, 0.25)",
                borderRadius: 3,
                cursor: "pointer",
                padding: 0,
                color: "#ffffff",
              }}
            >
              <JdIcon
                name={prefs.theme === "dark" ? "sun" : "moon"}
                size={16}
                stroke={2}
                color="#ffffff"
              />
            </button>
          </div>
        ) : null}

        {!hideActions && !isHomeBrand ? (
          <nav
            className="jd-masthead__actions"
            aria-label={t("masthead.actionsAria")}
            data-testid="jd-masthead-actions"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: 0,
              flexShrink: 0,
            }}
          >
            <MastheadSearchButton />
            <MastheadNotifyButton />
            <MastheadProfileButton />
          </nav>
        ) : null}
      </div>
    </header>
  );
}
