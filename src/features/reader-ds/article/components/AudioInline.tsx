import { JdIcon } from "../../components/icons";

/** Inline “यह लेख सुनें” control — approved B11 atom. */
export function AudioInline({ durationLabel = "हिन्दी नैरेशन" }: { durationLabel?: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 11,
        background: "var(--jd-paper-2)",
        border: "1px solid var(--jd-line)",
        borderRadius: 3,
        padding: "10px 12px",
        margin: "4px 0 14px",
      }}
    >
      <button
        type="button"
        aria-label="यह लेख सुनें"
        data-action="headphone"
        style={{
          width: 36,
          height: 36,
          borderRadius: 36,
          background: "var(--jd-red)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          border: "none",
          cursor: "pointer",
          color: "#fff",
        }}
      >
        <JdIcon name="play" size={18} stroke={1.9} color="#fff" />
      </button>
      <div style={{ flex: 1 }}>
        <div className="jd-ui" style={{ fontSize: 12, fontWeight: 800, color: "var(--jd-ink)" }}>
          यह लेख सुनें
        </div>
        <div className="jd-ui" style={{ fontSize: 10.5, color: "var(--jd-muted)" }}>
          {durationLabel}
        </div>
      </div>
      <JdIcon name="download" size={18} stroke={1.8} color="var(--jd-muted)" />
    </div>
  );
}
