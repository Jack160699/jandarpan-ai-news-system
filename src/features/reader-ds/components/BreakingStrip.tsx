"use client";

import Link from "next/link";
import { useJdDsT } from "../i18n";

type BreakingStripProps = {
  headline?: string | null;
  href?: string;
};

/**
 * Conditional breaking strip — white badge + red-dot + serif ellipsis
 * (approved A1 atom). Renders nothing when no real breaking headline.
 * Headline text remains CMS content (untranslated).
 */
export function BreakingStrip({ headline, href = "#" }: BreakingStripProps) {
  const { t, locale } = useJdDsT();
  if (!headline || !headline.trim()) return null;
  return (
    <Link
      href={href}
      className="jd-ui jd-breaking-strip"
      data-jd-locale={locale}
      style={{
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        gap: 9,
        padding: "7px 14px",
        background: "var(--jd-red)",
        color: "#fff",
        textDecoration: "none",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      <span
        style={{
          fontWeight: 800,
          fontSize: locale === "en" ? 9.5 : 10,
          letterSpacing: ".08em",
          background: "#fff",
          color: "var(--jd-red)",
          padding: "2px 7px",
          borderRadius: 2,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          gap: 3,
          whiteSpace: "nowrap",
        }}
      >
        <span
          aria-hidden
          style={{
            width: 5,
            height: 5,
            borderRadius: 5,
            background: "var(--jd-red)",
            display: "inline-block",
          }}
        />
        {t("common.breaking")}
      </span>
      <span
        className="jd-serif"
        style={{
          fontSize: 13,
          fontWeight: 600,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          color: "#fff",
        }}
      >
        {headline}
      </span>
    </Link>
  );
}
