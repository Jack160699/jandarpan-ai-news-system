"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArticleImage } from "../components/ArticleImage";
import { DesktopPrimaryNav } from "../components/DesktopPrimaryNav";
import { Masthead } from "../components/Masthead";
import { ReaderShell } from "../components/ReaderShell";
import { Tag } from "../components/primitives";
import { Byline } from "../article/components/Byline";
import { JdIcon } from "../components/icons";
import { useJdDsT } from "../i18n";
import { getOfflineArticle, setFavorite } from "./db";
import { useOnlineStatus } from "./hooks";
import type { OfflineArticleRecord } from "./types";

/** Read a package from IndexedDB — no network article fetch. */
export function OfflineReaderPage({ slug }: { slug: string }) {
  const { t } = useJdDsT();
  const online = useOnlineStatus();
  const [row, setRow] = useState<OfflineArticleRecord | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    void getOfflineArticle(slug).then((r) => {
      if (!cancelled) setRow(r);
    });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (row === undefined) {
    return (
      <ReaderShell activeNav="more">
        <Masthead back backHref="/archive/offline" pageTitle={t("offline.library")} />
        <p className="jd-ui" style={{ padding: 16, color: "var(--jd-muted)" }}>
          {t("offline.loading")}
        </p>
      </ReaderShell>
    );
  }

  if (!row) {
    return (
      <ReaderShell activeNav="more">
        <Masthead back backHref="/archive/offline" pageTitle={t("offline.notAvailable")} />
        <DesktopPrimaryNav active="more" />
        <div data-testid="jd-offline-unavailable" style={{ padding: "28px 18px", textAlign: "center" }}>
          <JdIcon name="wifiOff" size={28} stroke={1.8} color="var(--jd-amber)" />
          <h1 className="jd-serif" style={{ fontSize: 22, margin: "12px 0 8px" }}>
            {t("offline.notAvailable")}
          </h1>
          <p className="jd-ui" style={{ fontSize: 13.5, color: "var(--jd-ink-3)", margin: "0 0 16px" }}>
            {t("offline.notAvailableBody")}
          </p>
          <Link href="/archive/offline" className="jd-ui" style={linkBtn}>
            {t("offline.goLibrary")}
          </Link>
          {online ? (
            <Link href={`/story/${slug}`} className="jd-ui" style={{ ...linkBtn, marginLeft: 8 }}>
              {t("offline.refresh")}
            </Link>
          ) : null}
        </div>
      </ReaderShell>
    );
  }

  return (
    <ReaderShell activeNav="more" hideBottomNav>
      <div
        role="status"
        aria-live="polite"
        data-testid="jd-offline-mode-banner"
        className="jd-ui"
        style={{
          flexShrink: 0,
          background: "var(--jd-navy)",
          color: "#fff",
          padding: "8px 14px",
          fontSize: 12,
          fontWeight: 800,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <JdIcon name="wifiOff" size={16} stroke={1.9} color="#fff" />
        {t("offline.modeBanner")}
      </div>
      <Masthead back backHref="/archive/offline" pageTitle={t("offline.modeBanner")} />
      <DesktopPrimaryNav active="more" />

      <article data-testid="jd-offline-reader" style={{ padding: "12px 16px 40px", flex: 1, overflow: "auto" }}>
        <Tag>{row.kicker || row.category}</Tag>
        <h1
          className="jd-serif"
          style={{
            margin: "6px 0 8px",
            fontSize: 24,
            lineHeight: 1.3,
            fontWeight: 700,
            color: "var(--jd-ink)",
            overflowWrap: "anywhere",
          }}
        >
          {row.headline}
        </h1>

        {row.summary ? (
          <p
            className="jd-ui"
            style={{
              fontSize: 14,
              lineHeight: 1.55,
              color: "var(--jd-ink-2)",
              borderLeft: "3px solid var(--jd-gold)",
              paddingLeft: 10,
              margin: "0 0 12px",
            }}
          >
            {row.summary}
          </p>
        ) : null}

        <Byline
          author={row.author}
          role={row.role}
          timeLabel={row.publishedLabel}
          readTime={null}
        />

        {row.heroImageUrl ? (
          <>
            <ArticleImage
              src={row.heroImageUrl}
              alt={row.headline}
              ratio="lead"
              tone="city"
              priority
              sizes="100vw"
            />
            {row.imageCaption ? (
              <div
                className="jd-ui"
                style={{
                  fontSize: 10.5,
                  color: "var(--jd-muted)",
                  margin: "6px 0 14px",
                  fontStyle: "italic",
                }}
              >
                {row.imageCaption}
              </div>
            ) : null}
          </>
        ) : null}

        {row.paragraphs.map((p, i) => (
          <p
            key={i}
            className="jd-serif"
            style={{
              margin: "0 0 12px",
              fontSize: 15,
              lineHeight: 1.75,
              color: "var(--jd-ink-2)",
            }}
          >
            {p}
          </p>
        ))}

        <div
          className="jd-ui"
          style={{
            marginTop: 16,
            padding: 12,
            border: "1px dashed var(--jd-line)",
            borderRadius: 3,
            fontSize: 12,
            color: "var(--jd-ink-3)",
          }}
        >
          <p style={{ margin: "0 0 6px" }}>{t("offline.shareDisabled")}</p>
          <p style={{ margin: 0 }}>{t("offline.commentsDisabled")}</p>
        </div>

        <div style={{ marginTop: 14, display: "flex", flexWrap: "wrap", gap: 8 }}>
          <button
            type="button"
            className="jd-ui"
            style={linkBtn}
            onClick={() => {
              void setFavorite(row.slug, !row.favorite).then(() =>
                getOfflineArticle(slug).then(setRow)
              );
            }}
          >
            {row.favorite ? t("offline.favoriteOn") : t("offline.favoriteToggle")}
          </button>
          <Link href="/archive/offline" className="jd-ui" style={linkBtn}>
            {t("offline.goLibrary")}
          </Link>
          {online ? (
            <Link href={`/story/${row.slug}`} className="jd-ui" style={linkBtn}>
              {t("offline.refresh")}
            </Link>
          ) : null}
        </div>
      </article>
    </ReaderShell>
  );
}

const linkBtn = {
  display: "inline-flex",
  alignItems: "center",
  minHeight: 40,
  padding: "0 12px",
  border: "1px solid var(--jd-line)",
  borderRadius: 3,
  background: "#fff",
  color: "var(--jd-navy)",
  fontWeight: 700,
  fontSize: 12.5,
  textDecoration: "none",
  cursor: "pointer",
} as const;
