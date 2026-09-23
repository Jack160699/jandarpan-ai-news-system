import Link from "next/link";
import { ArticleImage } from "../components/ArticleImage";
import { Tag } from "../components/primitives";
import { JdIcon } from "../components/icons";
import { hindiRelativeTime, storyHref } from "../utils";
import type { FormattedReaderStory } from "@/lib/engagement/story-format";

const TONES = ["city", "field", "market", "sport", "court"] as const;

type FormatStoryCardProps = {
  story: FormattedReaderStory;
  last?: boolean;
  toneIndex?: number;
};

/**
 * Varied but consistent card treatments within Reader DS tokens.
 * Distinct format chip when non-standard; same row geometry for scanability.
 */
export function FormatStoryCard({
  story,
  last = false,
  toneIndex = 0,
}: FormatStoryCardProps) {
  const time = story.timeLabel ?? hindiRelativeTime(story.publishedAt);
  const tone = TONES[toneIndex % TONES.length];
  const formatClass =
    story.format !== "standard" ? `jd-format-card is-${story.format}` : "jd-format-card";

  return (
    <Link
      href={storyHref(story.slug)}
      className={formatClass}
      style={{
        display: "flex",
        gap: 12,
        padding: "11px 0",
        borderBottom: last ? "none" : "1px solid var(--jd-line-2)",
        color: "inherit",
        textDecoration: "none",
        alignItems: "flex-start",
      }}
    >
      <div style={{ width: 104, flexShrink: 0, borderRadius: 3, overflow: "hidden" }}>
        <ArticleImage
          src={story.imageUrl}
          alt={story.headline}
          altIsPhotoDescription={false}
          ratio="thumb"
          sizes="104px"
          tone={tone}
          category={story.kicker ?? "general"}
        />
      </div>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        <div>
          <div style={{ marginBottom: 3, display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            {story.formatLabel ? (
              <span className="jd-ui jd-format-chip">{story.formatLabel}</span>
            ) : null}
            <Tag>{story.kicker ?? "ख़बर"}</Tag>
          </div>
          <h3
            className="jd-serif jd-sec-title jd-type-card"
            style={{
              margin: 0,
              color: "var(--jd-ink)",
              fontSize: 16,
              fontWeight: 700,
              lineHeight: 1.34,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
            title={story.headline}
          >
            {story.headline}
          </h3>
        </div>
        {time ? (
          <div
            className="jd-ui jd-type-meta"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              color: "var(--jd-muted)",
              marginTop: 6,
              fontSize: 12,
            }}
          >
            <JdIcon name="clock" size={13} stroke={1.7} color="var(--jd-muted)" />
            {time}
          </div>
        ) : null}
      </div>
    </Link>
  );
}
