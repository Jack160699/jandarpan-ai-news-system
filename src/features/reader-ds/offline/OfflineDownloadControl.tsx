"use client";

import Link from "next/link";
import { useMemo, useState, type CSSProperties } from "react";
import type { ReaderArticleModel } from "../article/types";
import { JdIcon } from "../components/icons";
import { useJdDsT } from "../i18n";
import { useOfflineDownload, useOnlineStatus } from "./hooks";
import { loadPreferences } from "@/lib/reader-preferences";

type Props = {
  model: Pick<
    ReaderArticleModel,
    | "slug"
    | "headline"
    | "summary"
    | "paragraphs"
    | "imageUrl"
    | "imageCaption"
    | "author"
    | "role"
    | "publishedLabel"
    | "kicker"
    | "categoryLabel"
    | "tags"
    | "article"
  >;
};

/** Article download control — honest device package only. */
export function OfflineDownloadControl({ model }: Props) {
  const { t, locale } = useJdDsT();
  const online = useOnlineStatus();
  const {
    downloaded,
    record,
    busy,
    progress,
    download,
    remove,
    checkRefresh,
    applyRefresh,
  } = useOfflineDownload(model.slug);
  const [status, setStatus] = useState<string | null>(null);
  const [confirmUpdate, setConfirmUpdate] = useState(false);

  const fullModel = useMemo(() => model as ReaderArticleModel, [model]);

  async function onDownload() {
    setStatus(null);
    const prefs = loadPreferences();
    try {
      await download({
        model: fullModel,
        language: locale,
        district: prefs.homeDistrict ?? null,
      });
      setStatus(t("offline.downloaded"));
    } catch {
      setStatus(t("offline.downloadFailed"));
    }
  }

  async function onRefresh() {
    setStatus(null);
    const prep = await checkRefresh({ model: fullModel, language: locale });
    if (prep.needsConfirm && !confirmUpdate) {
      setConfirmUpdate(true);
      setStatus(t("offline.updateAvailable"));
      return;
    }
    const prefs = loadPreferences();
    const row = await applyRefresh({
      model: fullModel,
      language: locale,
      district: prefs.homeDistrict ?? null,
      confirm: true,
    });
    setConfirmUpdate(false);
    setStatus(row ? t("offline.updated") : t("offline.upToDate"));
  }

  const phaseLabel =
    progress?.phase === "images"
      ? t("offline.progressImages")
      : progress?.phase === "saving"
        ? t("offline.progressSaving")
        : progress?.phase === "removing"
          ? t("offline.removing")
          : progress?.phase === "updating"
            ? t("offline.updating")
            : null;

  return (
    <div
      className="jd-offline-download"
      data-testid="jd-offline-download"
      style={{
        margin: "12px 0 4px",
        padding: "12px 14px",
        border: "1px solid var(--jd-line)",
        borderRadius: 3,
        background: "var(--jd-paper-2)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        {!downloaded ? (
          <button
            type="button"
            className="jd-ui"
            disabled={busy || !online}
            onClick={() => void onDownload()}
            aria-label={t("offline.downloadAria")}
            style={btnPrimary}
          >
            <JdIcon name="download" size={16} stroke={1.9} color="#fff" />
            {busy ? t("offline.downloading") : t("offline.download")}
          </button>
        ) : (
          <>
            <span
              className="jd-ui"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: 12.5,
                fontWeight: 800,
                color: "var(--jd-navy)",
              }}
            >
              <JdIcon name="download" size={16} stroke={1.9} color="var(--jd-navy)" />
              {t("offline.downloadedState")}
            </span>
            {online ? (
              <button
                type="button"
                className="jd-ui"
                disabled={busy}
                onClick={() => void onRefresh()}
                style={btnSecondary}
              >
                {confirmUpdate ? t("offline.confirmUpdate") : t("offline.refresh")}
              </button>
            ) : null}
            <button
              type="button"
              className="jd-ui"
              disabled={busy}
              onClick={() => void remove()}
              style={btnDanger}
            >
              {t("offline.remove")}
            </button>
            <Link href={`/archive/offline/read/${model.slug}`} className="jd-ui" style={btnSecondary}>
              {t("offline.openOffline")}
            </Link>
          </>
        )}
        <Link href="/archive/offline" className="jd-ui" style={{ fontSize: 12, fontWeight: 700, color: "var(--jd-ink-3)" }}>
          {t("offline.library")}
        </Link>
      </div>

      {busy && phaseLabel ? (
        <p
          role="status"
          aria-live="polite"
          className="jd-ui"
          style={{ margin: "8px 0 0", fontSize: 11.5, color: "var(--jd-ink-3)" }}
        >
          {phaseLabel}
          {typeof progress?.progress === "number"
            ? ` · ${Math.round(progress.progress * 100)}%`
            : null}
        </p>
      ) : null}

      {status ? (
        <p role="status" aria-live="polite" className="jd-ui" style={{ margin: "8px 0 0", fontSize: 12, color: "var(--jd-ink-2)" }}>
          {status}
          {record ? ` · ${new Date(record.downloadedAt).toLocaleString(locale === "en" ? "en-IN" : "hi-IN")}` : null}
        </p>
      ) : null}

      {!online && !downloaded ? (
        <p className="jd-ui" style={{ margin: "8px 0 0", fontSize: 11.5, color: "var(--jd-amber)" }}>
          {t("offline.needOnlineToDownload")}
        </p>
      ) : null}
    </div>
  );
}

const btnPrimary: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  minHeight: 40,
  padding: "0 12px",
  border: "none",
  borderRadius: 3,
  background: "var(--jd-navy)",
  color: "#fff",
  fontWeight: 800,
  fontSize: 13,
  cursor: "pointer",
};

const btnSecondary: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  minHeight: 40,
  padding: "0 10px",
  border: "1px solid var(--jd-line)",
  borderRadius: 3,
  background: "#fff",
  color: "var(--jd-navy)",
  fontWeight: 700,
  fontSize: 12.5,
  cursor: "pointer",
  textDecoration: "none",
};

const btnDanger: CSSProperties = {
  ...btnSecondary,
  color: "var(--jd-red)",
  borderColor: "var(--jd-red)",
};
