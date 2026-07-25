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
          width: 28,
          textAlign: "center",
          flexShrink: 0,
          lineHeight: 1.15,
          paddingBlock: "0.05em",
        }}
      >
        {rank}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ marginBottom: 2 }}>
          <Tag>{story.kicker ?? "ट्रेंडिंग"}</Tag>
        </div>
        <div
          className="jd-serif jd-type-card-sm"
          style={{ color: "var(--jd-ink)" }}
          title={story.headline}
        >
          {story.headline}
        </div>
        {(story.viewCountLabel || story.growthLabel) && (
          <div
            className="jd-ui jd-type-meta"
            style={{ display: "flex", gap: 12, marginTop: 6, color: "var(--jd-muted)" }}
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
