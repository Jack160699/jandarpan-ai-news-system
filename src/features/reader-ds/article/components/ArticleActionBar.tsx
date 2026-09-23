"use client";

import Link from "next/link";
import { useState } from "react";
import { JdIcon } from "../../components/icons";
import { useJdDsT } from "../../i18n";

type ArticleActionBarProps = {
  headline: string;
  slug: string;
  readTime?: string;
};

/** WhatsApp official brand SVG icon */
function WhatsAppIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      style={{ display: "block", flexShrink: 0 }}
    >
      <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2m.01 1.67c4.55 0 8.24 3.69 8.24 8.24 0 2.2-.86 4.28-2.42 5.83a8.2 8.2 0 0 1-5.82 2.41h-.01c-1.45 0-2.88-.39-4.14-1.13l-.3-.18-3.08.81.82-3-.2-.31a8.17 8.17 0 0 1-1.25-4.43c0-4.55 3.69-8.24 8.24-8.24m4.52 11.66c-.25-.13-1.47-.72-1.7-.81-.23-.08-.39-.13-.56.13-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.13-1.06-.39-2.02-1.24-.75-.67-1.26-1.49-1.4-1.74-.15-.25-.02-.39.11-.51.11-.11.25-.29.38-.44.13-.15.17-.25.25-.42.08-.17.04-.32-.02-.45-.06-.13-.56-1.35-.77-1.85-.2-.49-.41-.42-.56-.43h-.48c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.24.9 2.44 1.03 2.61.13.17 1.77 2.7 4.29 3.79.6.26 1.07.41 1.44.53.6.19 1.15.16 1.59.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.08.15-1.18-.06-.1-.23-.17-.48-.29" />
    </svg>
  );
}

/**
 * Share-first action bar rendered directly below the summary and before article body.
 * 1. Prominent WhatsApp share button
 * 2. Native Share / Copy Link
 * 3. Secondary audio pill ("सुनें")
 * 4. Secondary bookmark / save
 */
export function ArticleActionBar({ headline, slug, readTime }: ArticleActionBarProps) {
  const { t, locale } = useJdDsT();
  const [copied, setCopied] = useState(false);

  const getCanonicalUrl = () => {
    if (typeof window !== "undefined") {
      return `${window.location.origin}/story/${slug}`;
    }
    return `https://www.jandarpan.news/story/${slug}`;
  };

  const handleWhatsAppShare = () => {
    const url = getCanonicalUrl();
    const text = `${headline}\n${url}`;
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    if (typeof window !== "undefined") {
      window.open(waUrl, "_blank", "noopener,noreferrer");
    }
  };

  const handleNativeShare = async () => {
    const url = getCanonicalUrl();
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: headline,
          text: headline,
          url,
        });
        return;
      } catch {
        /* user dismissed share dialog */
      }
    }
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2400);
    }
  };

  return (
    <div
      className="jd-article-actions jd-ui"
      data-testid="jd-article-action-bar"
      style={{
        display: "flex",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 8,
        margin: "16px 0 20px",
        padding: "10px 0",
        borderTop: "1px solid var(--jd-line)",
        borderBottom: "1px solid var(--jd-line)",
      }}
    >
      {/* 1. Primary Action: Direct WhatsApp Share */}
      <button
        type="button"
        onClick={handleWhatsAppShare}
        aria-label="Share on WhatsApp"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          background: "#25D366",
          color: "#ffffff",
          border: "none",
          borderRadius: 20,
          padding: "8px 14px",
          fontSize: 13,
          fontWeight: 700,
          cursor: "pointer",
          boxShadow: "0 1px 3px rgba(37,211,102,0.3)",
          textDecoration: "none",
        }}
      >
        <WhatsAppIcon size={18} />
        <span>WhatsApp</span>
      </button>

      {/* 2. Secondary Share: Native Share or Copy Link */}
      <button
        type="button"
        onClick={handleNativeShare}
        aria-label="Share"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          background: "var(--jd-paper-deep)",
          color: "var(--jd-ink)",
          border: "1px solid var(--jd-line-2)",
          borderRadius: 20,
          padding: "8px 12px",
          fontSize: 12.5,
          fontWeight: 650,
          cursor: "pointer",
        }}
      >
        <JdIcon name="share" size={15} stroke={1.9} color="var(--jd-ink)" />
        <span>{copied ? (locale === "en" ? "Link Copied!" : "लिंक कॉपी हुआ!") : (locale === "en" ? "Share" : "शेयर")}</span>
      </button>

      {/* 3. Audio: Secondary Pill */}
      <Link
        href={slug ? `/listen?story=${encodeURIComponent(slug)}` : "/listen"}
        aria-label={t("action.listen")}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          background: "transparent",
          color: "var(--jd-ink-2)",
          border: "1px solid var(--jd-line-2)",
          borderRadius: 20,
          padding: "8px 12px",
          fontSize: 12.5,
          fontWeight: 600,
          textDecoration: "none",
        }}
      >
        <JdIcon
          name="headphone"
          size={15}
          stroke={1.8}
          color="var(--jd-ink-2)"
        />
        <span>{t("action.listen")}</span>
      </Link>
    </div>
  );
}
