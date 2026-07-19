import Link from "next/link";
import { JdIcon } from "./icons";

type UtilityRowProps = {
  district?: string;
  districtHref?: string;
  dateLabel?: string;
  temp?: string;
};

function formatShortHindiDate(): string {
  try {
    const d = new Date();
    const weekday = new Intl.DateTimeFormat("hi-IN", { weekday: "short" }).format(d);
    const day = d.getDate();
    const month = new Intl.DateTimeFormat("hi-IN", { month: "long" }).format(d);
    // Design pattern: "शुक्र · 19 जुलाई"
    return `${weekday.replace(/\.$/, "")} · ${day} ${month}`;
  } catch {
    return "";
  }
}

/**
 * Compact utility row under masthead — navyDeep, three clusters:
 * district+chev · date · weather+temp (approved A1).
 */
export function UtilityRow({
  district = "रायपुर",
  districtHref = "/district?select=1",
  dateLabel,
  temp = "32°",
}: UtilityRowProps) {
  const date = dateLabel ?? formatShortHindiDate();
  return (
    <div
      className="jd-ui"
      style={{
        flexShrink: 0,
        background: "var(--jd-navy-deep)",
        color: "#c7d0e2",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "6px 14px",
        fontSize: 11.5,
      }}
    >
      <Link
        href={districtHref}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 5,
          fontWeight: 700,
          color: "var(--jd-gold-soft)",
          textDecoration: "none",
        }}
      >
        <JdIcon name="pin" size={13} stroke={2} color="var(--jd-gold)" />
        {district}
        <JdIcon name="chevD" size={12} stroke={2} color="#8ea0c4" />
      </Link>
      <span style={{ color: "#8ea0c4" }}>{date}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 4, fontWeight: 600 }}>
        <JdIcon name="rain" size={14} stroke={1.8} color="var(--jd-gold-soft)" />
        <span>{temp}</span>
      </div>
    </div>
  );
}
