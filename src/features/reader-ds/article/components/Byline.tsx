import { JdIcon } from "../../components/icons";

type BylineProps = {
  author: string;
  role?: string;
  timeLabel?: string | null;
  readTime?: string | null;
};

/** Author + meta row — approved B11 atom. */
export function Byline({ author, role, timeLabel, readTime }: BylineProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 9,
        padding: "10px 0",
        borderTop: "1px solid var(--jd-line-2)",
        borderBottom: "1px solid var(--jd-line-2)",
        margin: "10px 0",
      }}
    >
      <div
        aria-hidden
        style={{
          width: 34,
          height: 34,
          borderRadius: 34,
          background: "linear-gradient(135deg, var(--jd-navy), var(--jd-red))",
          flexShrink: 0,
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="jd-ui" style={{ fontSize: 12.5, fontWeight: 800, color: "var(--jd-ink)" }}>
          {author}
        </div>
        <div className="jd-ui" style={{ fontSize: 10.5, color: "var(--jd-muted)" }}>
          {[role, timeLabel].filter(Boolean).join(" · ")}
        </div>
      </div>
      {readTime ? (
        <div
          className="jd-ui"
          style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--jd-muted)" }}
        >
          <JdIcon name="clock" size={13} stroke={1.7} color="var(--jd-muted)" />
          {readTime}
        </div>
      ) : null}
    </div>
  );
}
