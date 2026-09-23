import Link from "next/link";
import { Tag } from "./primitives";
import { JdIcon } from "./icons";
import { ArticleImage } from "./ArticleImage";
import { storyHref, type ReaderStory } from "../utils";

/** A5 trending ranked row — large rank numeral + visual thumbnail + tag + headline + views/growth. */
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
        gap: 12,
        alignItems: "center",
        padding: "11px 0",
        borderBottom: last ? "none" : "1px solid var(--jd-line-2)",
        color: "inherit",
        textDecoration: "none",
      }}
    >
      <div
        className="jd-brand"
        style={{
          fontSize: 26,
          fontWeight: 800,
          color: top ? "var(--jd-red)" : "var(--jd-muted)",
          width: 24,
          textAlign: "center",
          flexShrink: 0,
          lineHeight: 1,
        }}
      >
        {rank}
      </div>
      <div style={{ width: 84, height: 60, flexShrink: 0, borderRadius: 3, overflow: "hidden" }}>
        <ArticleImage
          src={story.imageUrl}
          alt={story.headline}
          altIsPhotoDescription={false}
          ratio="thumb"
          sizes="84px"
          category={story.kicker ?? "trending"}
        />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ marginBottom: 2 }}>
          <Tag>{story.kicker ?? "ट्रेंडिंग"}</Tag>
        </div>
        <div
          className="jd-serif jd-type-card-sm"
          style={{ color: "var(--jd-ink)", fontWeight: 700, fontSize: 13.5, lineHeight: 1.35 }}
          title={story.headline}
        >
          {story.headline}
        </div>
        {(story.viewCountLabel || story.growthLabel) && (
          <div
            className="jd-ui jd-type-meta"
            style={{ display: "flex", gap: 12, marginTop: 4, color: "var(--jd-muted)" }}
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

