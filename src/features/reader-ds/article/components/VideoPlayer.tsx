import { ArticleImage } from "../../components/ArticleImage";
import { JdIcon } from "../../components/icons";

type VideoPlayerProps = {
  imageUrl?: string | null;
  alt: string;
  /** Optional duration labels from real metadata only. */
  currentLabel?: string | null;
  durationLabel?: string | null;
  progress?: number;
};

/** B15 — 16:9 player chrome over hero still (no invented viewer counts). */
export function VideoPlayer({
  imageUrl,
  alt,
  currentLabel,
  durationLabel,
  progress = 0.35,
}: VideoPlayerProps) {
  const pct = Math.max(0, Math.min(1, progress)) * 100;
  return (
    <div style={{ flexShrink: 0, position: "relative", background: "#000" }}>
      <ArticleImage src={imageUrl} alt={alt} ratio="video" tone="night" priority sizes="100vw" />
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <button
          type="button"
          aria-label="वीडियो चलाएँ"
          data-action="play-video"
          style={{
            width: 56,
            height: 56,
            borderRadius: 56,
            background: "rgba(158,27,34,.92)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "none",
            cursor: "pointer",
            color: "#fff",
          }}
        >
          <JdIcon name="play" size={26} stroke={1.9} color="#fff" />
        </button>
      </div>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          padding: "10px 12px",
          background: "linear-gradient(transparent, rgba(0,0,0,.7))",
        }}
      >
        <div style={{ height: 3, borderRadius: 3, background: "rgba(255,255,255,.3)" }}>
          <div
            style={{
              width: `${pct}%`,
              height: 3,
              borderRadius: 3,
              background: "var(--jd-red)",
            }}
          />
        </div>
        {(currentLabel || durationLabel) && (
          <div
            className="jd-ui"
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: 6,
              fontSize: 10.5,
              color: "#fff",
            }}
          >
            <span>{currentLabel ?? "0:00"}</span>
            <span>{durationLabel ?? ""}</span>
          </div>
        )}
      </div>
    </div>
  );
}
