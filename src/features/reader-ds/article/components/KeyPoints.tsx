/** B12 — red-accent “मुख्य बिंदु” bullet box from real takeaways. */
export function KeyPoints({ points }: { points: string[] }) {
  if (!points.length) return null;
  return (
    <div
      style={{
        background: "var(--jd-paper-2)",
        borderLeft: "3px solid var(--jd-red)",
        padding: "11px 13px",
        marginBottom: 14,
      }}
    >
      <div
        className="jd-ui"
        style={{
          fontSize: 10.5,
          fontWeight: 800,
          color: "var(--jd-red)",
          letterSpacing: ".08em",
          marginBottom: 6,
        }}
      >
        मुख्य बिंदु
      </div>
      {points.map((b, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            gap: 8,
            marginBottom: i < points.length - 1 ? 6 : 0,
          }}
        >
          <span style={{ color: "var(--jd-red)", fontWeight: 800 }} aria-hidden>
            •
          </span>
          <span className="jd-ui" style={{ fontSize: 12.5, lineHeight: 1.4, color: "var(--jd-ink-2)" }}>
            {b}
          </span>
        </div>
      ))}
    </div>
  );
}
