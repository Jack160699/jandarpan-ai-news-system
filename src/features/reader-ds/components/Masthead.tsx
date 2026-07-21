"use client";

import Link from "next/link";
import { useJdDsT } from "../i18n";
import { JdIcon } from "./icons";
import { MastheadSearchButton } from "./MastheadSearchButton";

type MastheadProps = {
  pageTitle?: string;
  back?: boolean;
  backHref?: string;
  /** Hide right-side actions (used on focused overlays). */
  hideActions?: boolean;
  /** Gold premium badge beside wordmark (E43 member home). */
  premiumBadge?: boolean;
  /** Replace back/brand with close control (E36 overlay). */
  closeHref?: string;
};

/**
 * Compact sticky masthead — matches approved A1 atom:
 * solid navy · red “ज” mark · Tiro 22 wordmark · goldSoft icons · avatar.
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

  return (
    <header
      className="jd-masthead"
      data-jd-locale={locale}
      style={{
        position: "sticky",
        top: 0,
        zIndex: 40,
        flexShrink: 0,
        background: "var(--jd-navy)",
        color: "var(--jd-paper)",
        padding: "8px 14px 9px",
      }}
    >
      <div
        className="jd-masthead__inner"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          maxWidth: 900,
          margin: "0 auto",
          width: "100%",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          {closeHref ? (
            <Link
              href={closeHref}
              aria-label={t("masthead.closeAria")}
              style={{ display: "flex", color: "var(--jd-gold-soft)" }}
            >
              <JdIcon name="close" size={22} stroke={2} color="var(--jd-gold-soft)" />
            </Link>
          ) : back ? (
            <Link
              href={backHref}
              aria-label={t("masthead.backAria")}
              style={{ display: "flex", color: "var(--jd-gold-soft)" }}
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
            <span className="jd-serif" style={{ fontSize: 18, fontWeight: 700, color: "var(--jd-paper)" }}>
              {pageTitle}
            </span>
          ) : (
            <Link
              href="/"
              style={{ textDecoration: "none", color: "inherit", display: "flex", alignItems: "center", gap: 8 }}
            >
              <span
                className={locale === "en" ? "jd-ui" : "jd-brand"}
                style={{ fontSize: locale === "en" ? 18 : 22, lineHeight: 1, display: "block", fontWeight: 700 }}
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
                  }}
                >
                  {t("masthead.premium")}
                </span>
              ) : null}
            </Link>
          )}
        </div>

        {!hideActions ? (
          <nav
            style={{ display: "flex", gap: 16, alignItems: "center", flexShrink: 0 }}
            aria-label={t("masthead.actionsAria")}
          >
            <MastheadSearchButton />
            <Link
              href="/notifications"
              aria-label={t("masthead.notifyAria")}
              style={{
                display: "flex",
                minWidth: 44,
                minHeight: 44,
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
              }}
            >
              <JdIcon name="bell" size={21} stroke={1.9} color="var(--jd-gold-soft)" />
              <span
                aria-hidden
                style={{
                  position: "absolute",
                  top: 10,
                  right: 10,
                  width: 7,
                  height: 7,
                  borderRadius: 7,
                  background: "var(--jd-red)",
                  border: "1.5px solid var(--jd-navy)",
                }}
              />
            </Link>
            <Link
              href="/archive"
              aria-label={t("masthead.profileAria")}
              style={{
                display: "flex",
                minWidth: 44,
                minHeight: 44,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span
                aria-hidden
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 24,
                  background: "linear-gradient(135deg, var(--jd-gold), var(--jd-red))",
                }}
              />
            </Link>
          </nav>
        ) : null}
      </div>
    </header>
  );
}
