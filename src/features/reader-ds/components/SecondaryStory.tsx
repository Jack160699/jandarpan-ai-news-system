import Link from "next/link";
import { ArticleImage } from "./ArticleImage";
import { Tag } from "./primitives";
import { JdIcon } from "./icons";
import { hindiRelativeTime, storyHref, type ReaderStory } from "../utils";

const TONES = ["city", "field", "market", "sport", "court"] as const;

/** Horizontal story row: text left, 96×72 thumb right (approved A1). */
export function SecondaryStory({
  story,
  last = false,
  toneIndex = 0,
}: {
  story: ReaderStory;
  last?: boolean;
  toneIndex?: number;
}) {
  const time = story.timeLabel ?? hindiRelativeTime(story.publishedAt);
  const tone = TONES[toneIndex % TONES.length];
  return (
    <Link
      href={storyHref(story.slug)}
      style={{
        display: "flex",
        gap: 11,
        padding: "11px 0",
        borderBottom: last ? "none" : "1px solid var(--jd-line-2)",
        color: "inherit",
        textDecoration: "none",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ marginBottom: 3 }}>
          <Tag>{story.kicker ?? "ख़बर"}</Tag>
        </div>
        <h3
          className="jd-serif jd-sec-title jd-type-card"
          style={{
            margin: 0,
            color: "var(--jd-ink)",
          }}
          title={story.headline}
        >
          {story.headline}
        </h3>
        {time ? (
          <div
            className="jd-ui jd-type-meta"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              color: "var(--jd-muted)",
              marginTop: 6,
            }}
          >
            <JdIcon name="clock" size={13} stroke={1.7} color="var(--jd-muted)" />
            {time}
          </div>
        ) : null}
      </div>
      <div style={{ width: 96, flexShrink: 0 }}>
        <ArticleImage
          src={story.imageUrl}
          alt={story.headline}
          altIsPhotoDescription={false}
          ratio="thumb"
          sizes="96px"
          tone={tone}
          category={story.kicker ?? "general"}
        />
      </div>
    </Link>
  );
}
