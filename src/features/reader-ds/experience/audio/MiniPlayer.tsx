"use client";

import { JdIcon } from "../../components/icons";
import { useJdDsT } from "../../i18n";
import { useReaderAudioOptional, trackTimeLabel } from "./AudioProvider";

/** C22 — sticky mini player above bottom nav. */
export function MiniPlayer() {
  const { t } = useJdDsT();
  const audio = useReaderAudioOptional();
  if (!audio?.visible || !audio.current || audio.fullOpen) return null;

  const {
    current,
    playing,
    positionSec,
    durationSec,
    status,
    toggle,
    next,
    openFull,
    retry,
    errorMessage,
    canPlayCurrent,
  } = audio;

  const busy = status === "loading" || status === "buffering";
  const failed = status === "failed" || status === "unavailable";
  const duration = durationSec || current.durationSec;

  return (
    <div
      role="region"
      aria-label={t("listen.miniPlayerAria")}
      aria-busy={busy || undefined}
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: "calc(56px + env(safe-area-inset-bottom))",
        zIndex: 55,
        background: "var(--jd-navy)",
        color: "var(--jd-paper)",
        padding: "9px 14px",
        display: "flex",
        alignItems: "center",
        gap: 11,
        borderTop: "2px solid var(--jd-gold)",
      }}
    >
      <button
        type="button"
        onClick={openFull}
        aria-label={t("listen.openFullAria")}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 11,
          flex: 1,
          minWidth: 0,
          background: "none",
          border: "none",
          color: "inherit",
          cursor: "pointer",
          padding: 0,
          textAlign: "left",
        }}
      >
        <div
          aria-hidden
          style={{
            width: 34,
            height: 34,
            borderRadius: 2,
            background: "linear-gradient(135deg,#586178,#3a4258)",
            flexShrink: 0,
          }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            className="jd-serif"
            style={{
              fontSize: 13,
              fontWeight: 600,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {current.headline}
          </div>
          <div className="jd-ui" style={{ fontSize: 10, color: "#8ea0c4" }}>
            {failed
              ? errorMessage || t("listen.unavailable")
              : busy
                ? status === "buffering"
                  ? t("listen.buffering")
                  : t("listen.loading")
                : `${t("listen.todayBriefingShort")} · ${trackTimeLabel(positionSec, duration)}`}
          </div>
        </div>
      </button>
      {failed ? (
        <button
          type="button"
          aria-label={t("listen.retry")}
          onClick={retry}
          className="jd-ui"
          style={{
            background: "none",
            border: "1px solid var(--jd-gold-soft)",
            color: "var(--jd-gold-soft)",
            cursor: "pointer",
            padding: "6px 10px",
            fontSize: 11,
            fontWeight: 700,
            minHeight: 44,
          }}
        >
          {t("listen.retry")}
        </button>
      ) : (
        <button
          type="button"
          aria-label={
            !canPlayCurrent
              ? t("listen.playUnavailableAria")
              : playing
                ? t("listen.pause")
                : t("listen.play")
          }
          onClick={toggle}
          disabled={!canPlayCurrent && !playing}
          style={{
            background: "none",
            border: "none",
            cursor: canPlayCurrent || playing ? "pointer" : "not-allowed",
            padding: 6,
            minWidth: 44,
            minHeight: 44,
            opacity: busy ? 0.7 : 1,
          }}
        >
          <JdIcon
            name={busy ? "play" : playing ? "pause" : "play"}
            size={24}
            stroke={2}
            color="var(--jd-gold-soft)"
          />
        </button>
      )}
      <button
        type="button"
        aria-label={t("listen.next")}
        onClick={next}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 6,
          minWidth: 44,
          minHeight: 44,
        }}
      >
        <JdIcon name="next" size={22} stroke={1.9} color="var(--jd-gold-soft)" />
      </button>
    </div>
  );
}
