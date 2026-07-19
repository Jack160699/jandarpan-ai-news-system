"use client";

import { JdIcon } from "../../components/icons";
import { useReaderAudioOptional, trackTimeLabel } from "./AudioProvider";

/** C22 — sticky mini player above bottom nav. */
export function MiniPlayer() {
  const audio = useReaderAudioOptional();
  if (!audio?.visible || !audio.current || audio.fullOpen) return null;

  const { current, playing, positionSec, toggle, next, openFull } = audio;

  return (
    <div
      role="region"
      aria-label="मिनी ऑडियो प्लेयर"
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
        aria-label="फ़ुल प्लेयर खोलें"
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
            आज की ब्रीफ़िंग · {trackTimeLabel(positionSec, current.durationSec)}
          </div>
        </div>
      </button>
      <button
        type="button"
        aria-label={playing ? "रोकें" : "चलाएँ"}
        onClick={toggle}
        style={{ background: "none", border: "none", cursor: "pointer", padding: 6 }}
      >
        <JdIcon name={playing ? "pause" : "play"} size={24} stroke={2} color="var(--jd-gold-soft)" />
      </button>
      <button
        type="button"
        aria-label="अगला"
        onClick={next}
        style={{ background: "none", border: "none", cursor: "pointer", padding: 6 }}
      >
        <JdIcon name="next" size={22} stroke={1.9} color="var(--jd-gold-soft)" />
      </button>
    </div>
  );
}
