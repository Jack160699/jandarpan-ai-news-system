import Link from "next/link";
import { Tag } from "./primitives";
import { storyHref, type ReaderStory } from "../utils";

function clockParts(iso?: string): { time: string; ampm: string; accent: string } {
  if (!iso) return { time: "—", ampm: "", accent: "var(--jd-navy)" };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { time: "—", ampm: "", accent: "var(--jd-navy)" };
  let h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  const time = `${h}:${String(m).padStart(2, "0")}`;
  const accent = h < 10 || (h === 10 && m < 30) ? "var(--jd-red)" : "var(--jd-navy)";
  return { time, ampm, accent };
}

/** A4 latest-news chronological row — time stamp left, vertical accent, story right. */
export function ChronoStory({
  story,
  last = false,
  accent,
}: {
  story: ReaderStory;
  last?: boolean;
  accent?: string;
}) {
  const parts = clockParts(story.publishedAt);
  const color = accent ?? parts.accent;
  return (
    <Link
      href={storyHref(story.slug)}
      style={{
        display: "flex",
        gap: 12,
        padding: "12px 0",
        borderBottom: last ? "none" : "1px solid var(--jd-line-2)",
        color: "inherit",
        textDecoration: "none",
        minHeight: 44,
      }}
    >
      <div style={{ width: 44, flexShrink: 0, textAlign: "right" }}>
        <div className="jd-ui" style={{ fontSize: 13, fontWeight: 800, color }}>
          {parts.time}
        </div>
        {parts.ampm ? (
          <div className="jd-ui" style={{ fontSize: 9, color: "var(--jd-muted)" }}>
            {parts.ampm}
          </div>
        ) : null}
      </div>
      <div style={{ width: 2, background: color, flexShrink: 0, borderRadius: 2 }} />
      <div>
        <div style={{ marginBottom: 2 }}>
          <Tag>{story.kicker ?? "ख़बर"}</Tag>
        </div>
        <div className="jd-serif" style={{ fontSize: 15, lineHeight: 1.34, fontWeight: 600, color: "var(--jd-ink)" }}>
          {story.headline}
        </div>
      </div>
    </Link>
  );
}
