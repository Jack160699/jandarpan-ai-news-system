"use client";

import Link from "next/link";
import { useJdDsT } from "../i18n";
import { JdIcon } from "./icons";

type MastheadProps = {
  pageTitle?: string;
  back?: boolean;
  backHref?: string;
  /** @deprecated Mobile header no longer shows Search/Notify/Profile; kept for API compat. */
  hideActions?: boolean;
  /** Gold premium badge beside wordmark (E43 member home). */
  premiumBadge?: boolean;
  /** Replace back/brand with close control (E36 overlay). */
  closeHref?: string;
};

/**
 * Compact sticky masthead — brand + optional back/close only.
 * Search / Notifications / Profile live in bottom nav More (/archive)
 * and desktop DeskChrome — not duplicated here.
 */
export function Masthead({
  pageTitle,
  back,
  backHref = "/",
  premiumBadge = false,
  closeHref,
}: MastheadProps) {
  const { t, locale } = useJdDsT();

  return (
    <header
      className="jd-masthead"
      data-jd-locale={locale}
      data-testid="jd-masthead"
      data-jd-masthead-actions="none"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 40,
        flexShrink: 0,
        background: "var(--jd-navy)",
        color: "var(--jd-paper)",
        padding: "7px 14px 8px",
      }}
    >
      <div
        className="jd-masthead__inner"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-start",
          gap: 8,
          maxWidth: 900,
          margin: "0 auto",
          width: "100%",
          minHeight: 32,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, flex: 1 }}>
          {closeHref ? (
            <Link
              href={closeHref}
              aria-label={t("masthead.closeAria")}
              style={{
                display: "flex",
                minWidth: 44,
                minHeight: 44,
                alignItems: "center",
                justifyContent: "center",
                color: "var(--jd-gold-soft)",
                margin: "-6px 0 -6px -6px",
              }}
            >
              <JdIcon name="close" size={22} stroke={2} color="var(--jd-gold-soft)" />
            </Link>
          ) : back ? (
            <Link
              href={backHref}
              aria-label={t("masthead.backAria")}
              style={{
                display: "flex",
                minWidth: 44,
                minHeight: 44,
                alignItems: "center",
                justifyContent: "center",
                color: "var(--jd-gold-soft)",
                margin: "-6px 0 -6px -6px",
              }}
            >
              <JdIcon name="arrowL" size={22} stroke={2} color="var(--jd-gold-soft)" />
            </Link>
          ) : (
            <Link
              href="/"
              aria-label={t("masthead.homeAria")}
              style={{
                width: 24,
                height: 24,
                borderRadius: 5,
                background: "var(--jd-red)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                textDecoration: "none",
              }}
            >
              <span
                className="jd-brand"
                style={{ fontSize: 15, color: "var(--jd-gold)", fontWeight: 700, lineHeight: 1 }}
              >
                ज
              </span>
            </Link>
          )}
          {pageTitle ? (
            <span
              className="jd-serif"
              style={{
                fontSize: 17,
                fontWeight: 700,
                color: "var(--jd-paper)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {pageTitle}
            </span>
          ) : (
            <Link
              href="/"
              style={{
                textDecoration: "none",
                color: "inherit",
                display: "flex",
                alignItems: "center",
                gap: 8,
                minWidth: 0,
              }}
            >
              <span
                className={locale === "en" ? "jd-ui" : "jd-brand"}
                style={{
                  fontSize: locale === "en" ? 17 : 20,
                  lineHeight: 1.1,
                  display: "block",
                  fontWeight: 700,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {t("brand.name")}
              </span>
              {premiumBadge ? (
                <span
                  className="jd-ui"
                  style={{
                    fontSize: 8.5,
                    fontWeight: 800,
                    letterSpacing: ".06em",
                    color: "var(--jd-navy)",
                    background: "var(--jd-gold)",
                    padding: "2px 6px",
                    borderRadius: 2,
                    flexShrink: 0,
                  }}
                >
                  {t("masthead.premium")}
                </span>
              ) : null}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
