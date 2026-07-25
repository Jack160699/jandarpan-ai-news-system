"use client";

import Link from "next/link";
import { useJdDsT } from "../i18n";
import { BrandMark } from "./BrandMark";
import { JdIcon } from "./icons";
import { MastheadBrandLogo } from "./MastheadBrandLogo";
import { MastheadNotifyButton } from "./MastheadNotifyButton";
import { MastheadProfileButton } from "./MastheadProfileButton";
import { MastheadSearchButton } from "./MastheadSearchButton";

type MastheadProps = {
  pageTitle?: string;
  back?: boolean;
  backHref?: string;
  /** Hide Search / Notifications / Profile (focused overlays). */
  hideActions?: boolean;
  /** Gold premium badge beside brand (E43 member home). */
  premiumBadge?: boolean;
  /** Replace back/brand with close control (E36 overlay). */
  closeHref?: string;
};

/**
 * Compact sticky phone masthead:
 * Left — approved compact-dark lockup on home; mark + title on inner pages.
 * Right — Search · Notifications · Profile/More.
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
                color: "var(--jd-gold-soft)",
                marginLeft: -6,
              }}
            >
              <JdIcon name="close" size={22} stroke={2} color="var(--jd-gold-soft)" />
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
                color: "var(--jd-gold-soft)",
                marginLeft: -6,
              }}
            >
              <JdIcon name="arrowL" size={22} stroke={2} color="var(--jd-gold-soft)" />
            </Link>
          ) : isHomeBrand ? (
            <Link
              href="/"
              aria-label={t("masthead.homeAria")}
              data-testid="jd-masthead-brand"
              style={{
                display: "flex",
                alignItems: "center",
                flexShrink: 1,
                minWidth: 0,
                textDecoration: "none",
                gap: 8,
              }}
            >
              <MastheadBrandLogo alt={t("brand.name")} />
              {premiumBadge ? (
                <span
                  className="jd-ui jd-type-caption"
                  style={{
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

        {!hideActions ? (
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
