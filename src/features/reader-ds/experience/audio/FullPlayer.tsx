"use client";

import Link from "next/link";
import { ArticleImage } from "../../components/ArticleImage";
import { JdIcon } from "../../components/icons";
import { formatDuration } from "./types";
import { useReaderAudio, trackTimeLabel } from "./AudioProvider";
import type { PlaybackSpeed } from "../prefs";

const SPEEDS: PlaybackSpeed[] = [0.75, 1, 1.25, 1.5, 1.75, 2];

/** C23 — dark full-screen player. */
export function FullPlayer() {
  const audio = useReaderAudio();
  if (!audio.fullOpen || !audio.current) return null;

  const {
    current,
    index,
    tracks,
    playing,
    progress,
    positionSec,
    speed,
    toggle,
    next,
    prev,
    seekBy,
    setSpeed,
    closeFull,
  } = audio;

  const cycleSpeed = () => {
    const i = SPEEDS.indexOf(speed);
    setSpeed(SPEEDS[(i + 1) % SPEEDS.length]);
  };

  return (
    <div
      className="jd-ds"
      data-theme="dark"
      role="dialog"
      aria-modal="true"
      aria-label="फ़ुल ऑडियो प्लेयर"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 80,
        background: "#0e1626",
        display: "flex",
        flexDirection: "column",
        color: "#e7edf6",
      }}
    >
      <div
        style={{
          flexShrink: 0,
          padding: "10px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <button
          type="button"
          aria-label="बंद करें"
          onClick={closeFull}
          style={{ background: "none", border: "none", cursor: "pointer", color: "#e7edf6" }}
        >
          <JdIcon name="chevD" size={24} stroke={2} color="#e7edf6" />
        </button>
        <span
          className="jd-ui"
          style={{ fontSize: 11.5, fontWeight: 700, color: "#93a4c2", letterSpacing: ".06em" }}
        >
          अभी चल रहा है
        </span>
        <Link href="/listen/queue" aria-label="कतार" style={{ display: "flex", color: "#e7edf6" }}>
          <JdIcon name="more" size={22} stroke={2} color="#e7edf6" />
        </Link>
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: "8px 20px 24px" }}>
        <ArticleImage
          src={current.imageUrl}
          alt={current.headline}
          ratio="lead"
          tone="city"
          sizes="100vw"
        />
        <h1
          className="jd-serif"
          style={{
            margin: "18px 0 4px",
            fontSize: 21,
            fontWeight: 700,
            color: "#e7edf6",
            lineHeight: 1.3,
            overflowWrap: "anywhere",
          }}
        >
          {current.headline}
        </h1>
        <div className="jd-ui" style={{ fontSize: 12, color: "#93a4c2", marginBottom: 16 }}>
          आज की ब्रीफ़िंग · खबर {index + 1}/{tracks.length}
        </div>

        <div
          style={{
            height: 4,
            borderRadius: 4,
            background: "rgba(255,255,255,.15)",
            marginBottom: 6,
          }}
        >
          <div
            style={{
              width: `${Math.max(2, progress * 100)}%`,
              height: 4,
              borderRadius: 4,
              background: "var(--jd-gold)",
            }}
          />
        </div>
        <div
          className="jd-ui"
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 11,
            color: "#93a4c2",
            marginBottom: 18,
          }}
        >
          <span>{formatDuration(positionSec)}</span>
          <span>{formatDuration(current.durationSec)}</span>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 26,
            marginBottom: 20,
          }}
        >
          <button type="button" aria-label="पिछला" onClick={prev} style={ctrlBtn}>
            <JdIcon name="prev" size={26} stroke={1.9} color="#e7edf6" />
          </button>
          <button type="button" aria-label="15 सेकंड पीछे" onClick={() => seekBy(-15)} style={ctrlBtn}>
            <span className="jd-ui" style={{ fontSize: 11, fontWeight: 800, color: "#93a4c2" }}>
              −15
            </span>
          </button>
          <button
            type="button"
            aria-label={playing ? "रोकें" : "चलाएँ"}
            onClick={toggle}
            style={{
              width: 64,
              height: 64,
              borderRadius: 64,
              background: "var(--jd-red)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "none",
              cursor: "pointer",
              color: "#fff",
            }}
          >
            <JdIcon name={playing ? "pause" : "play"} size={28} stroke={2} color="#fff" />
          </button>
          <button type="button" aria-label="15 सेकंड आगे" onClick={() => seekBy(15)} style={ctrlBtn}>
            <span className="jd-ui" style={{ fontSize: 11, fontWeight: 800, color: "#93a4c2" }}>
              +15
            </span>
          </button>
          <button type="button" aria-label="अगला" onClick={next} style={ctrlBtn}>
            <JdIcon name="next" size={26} stroke={1.9} color="#e7edf6" />
          </button>
        </div>

        <div
          className="jd-ui"
          style={{
            display: "flex",
            justifyContent: "space-around",
            borderTop: "1px solid rgba(150,175,215,.16)",
            paddingTop: 14,
          }}
        >
          <button type="button" onClick={cycleSpeed} style={tabBtn}>
            <div style={{ fontWeight: 700 }}>{speed.toFixed(1).replace(/\.0$/, ".0")}x</div>
            <div style={{ fontSize: 9, fontWeight: 500, opacity: 0.7 }}>गति</div>
          </button>
          <div style={tabBtn}>
            <div style={{ fontWeight: 700 }}>15 मि</div>
            <div style={{ fontSize: 9, fontWeight: 500, opacity: 0.7 }}>स्लीप</div>
          </div>
          <Link href={`/story/${current.slug}`} style={tabBtn}>
            प्रतिलेख
          </Link>
          <Link href="/listen/queue" style={tabBtn}>
            कतार
          </Link>
        </div>

        <p className="jd-ui" style={{ marginTop: 18, fontSize: 12, color: "#93a4c2", lineHeight: 1.5 }}>
          {trackTimeLabel(positionSec, current.durationSec)} · वास्तविक आवाज़ उपलब्ध होने पर स्ट्रीम,
          अन्यथा अवधि पाठ-लंबाई से अनुमानित।
        </p>
      </div>
    </div>
  );
}

const ctrlBtn: React.CSSProperties = {
  background: "none",
  border: "none",
  cursor: "pointer",
  color: "#e7edf6",
  minWidth: 44,
  minHeight: 44,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const tabBtn: React.CSSProperties = {
  textAlign: "center",
  fontFamily: "inherit",
  fontSize: 12,
  fontWeight: 700,
  color: "#93a4c2",
  background: "none",
  border: "none",
  cursor: "pointer",
  textDecoration: "none",
  minWidth: 56,
};
