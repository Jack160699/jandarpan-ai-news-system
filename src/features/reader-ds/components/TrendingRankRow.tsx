import Link from "next/link";
import { Tag } from "./primitives";
import { JdIcon } from "./icons";
import { storyHref, type ReaderStory } from "../utils";

/** A5 trending ranked row — large rank numeral + tag + headline + views/growth. */
export function TrendingRankRow({
  story,
  rank,
  last = false,
}: {
  story: ReaderStory;
  rank: number;
  last?: boolean;
}) {
  const top = rank <= 3;
  return (
    <Link
      href={storyHref(story.slug)}
      style={{
        display: "flex",
        gap: 13,
        alignItems: "center",
        padding: "13px 0",
        borderBottom: last ? "none" : "1px solid var(--jd-line-2)",
        color: "inherit",
        textDecoration: "none",
      }}
    >
      <div
        className="jd-brand"
        style={{
          fontSize: 30,
          fontWeight: 700,
          color: top ? "var(--jd-red)" : "var(--jd-line)",
          width: 26,
          textAlign: "center",
          flexShrink: 0,
          lineHeight: 1,
        }}
      >
        {rank}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ marginBottom: 2 }}>
          <Tag>{story.kicker ?? "ट्रेंडिंग"}</Tag>
        </div>
        <div className="jd-serif" style={{ fontSize: 15, lineHeight: 1.32, fontWeight: 600, color: "var(--jd-ink)" }}>
          {story.headline}
        </div>
        {(story.viewCountLabel || story.growthLabel) && (
          <div
            className="jd-ui"
            style={{ display: "flex", gap: 12, marginTop: 5, fontSize: 10.5, color: "var(--jd-muted)" }}
          >
            {story.viewCountLabel ? (
              <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                <JdIcon name="eye" size={12} stroke={1.7} color="var(--jd-muted)" />
                {story.viewCountLabel}
              </span>
            ) : null}
            {story.growthLabel ? (
              <span style={{ color: "var(--jd-ok)", fontWeight: 700 }}>{story.growthLabel}</span>
            ) : null}
          </div>
        )}
      </div>
    </Link>
  );
}
