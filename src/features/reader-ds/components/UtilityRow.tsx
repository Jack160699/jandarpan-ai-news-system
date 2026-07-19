import Link from "next/link";
import { JdIcon } from "./icons";

type UtilityRowProps = {
  district?: string;
  districtHref?: string;
  edition?: string;
  dateLabel?: string;
  weather?: string;
};

function formatHindiDate(): string {
  try {
    return new Intl.DateTimeFormat("hi-IN", {
      weekday: "long",
      day: "numeric",
      month: "long",
    }).format(new Date());
  } catch {
    return "";
  }
}

/** District · edition · date · weather utility row (under the masthead). */
export function UtilityRow({
  district = "रायपुर",
  districtHref = "/district",
  edition = "छत्तीसगढ़",
  dateLabel,
  weather = "32° आंशिक बादल",
}: UtilityRowProps) {
  const date = dateLabel ?? formatHindiDate();
  return (
    <div
      className="jd-ui"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
        padding: "7px 14px",
        background: "var(--jd-paper-2)",
        borderBottom: "1px solid var(--jd-line)",
        fontSize: 11.5,
        color: "var(--jd-ink-3)",
      }}
    >
      <Link
        href={districtHref}
        style={{ display: "flex", alignItems: "center", gap: 5, color: "var(--jd-navy)", fontWeight: 700 }}
      >
        <JdIcon name="pin" size={14} stroke={2} color="var(--jd-red)" />
        {district}
        <span style={{ color: "var(--jd-muted)", fontWeight: 600 }}>· {edition}</span>
      </Link>
      <div style={{ display: "flex", alignItems: "center", gap: 12, whiteSpace: "nowrap", overflow: "hidden" }}>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{date}</span>
        <span style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--jd-amber)", fontWeight: 700 }}>
          <JdIcon name="rain" size={13} stroke={1.8} color="var(--jd-amber)" />
          {weather}
        </span>
      </div>
    </div>
  );
}
