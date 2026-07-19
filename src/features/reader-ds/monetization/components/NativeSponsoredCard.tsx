import Link from "next/link";
import { JdIcon } from "../../components/icons";
import { ArticleImage } from "../../components/ArticleImage";

export type NativeSponsoredProps = {
  sponsorName: string;
  headline: string;
  ctaLabel?: string;
  href: string;
  imageUrl?: string | null;
};

/**
 * E44 — in-feed sponsored placement. Always labeled “प्रायोजित”; tinted so it
 * cannot be mistaken for editorial SecondaryStory.
 */
export function NativeSponsoredCard({
  sponsorName,
  headline,
  ctaLabel = "और जानें",
  href,
  imageUrl,
}: NativeSponsoredProps) {
  return (
    <aside
      aria-label={`प्रायोजित · ${sponsorName}`}
      style={{
        margin: "8px 14px",
        background: "#efe7d6",
        border: "1px solid var(--jd-gold)",
        borderRadius: 3,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "7px 12px 0",
        }}
      >
        <span
          className="jd-ui"
          style={{
            fontSize: 9,
            fontWeight: 800,
            letterSpacing: ".1em",
            color: "var(--jd-amber, #c07a1e)",
            textTransform: "uppercase",
          }}
        >
          प्रायोजित · {sponsorName}
        </span>
        <JdIcon name="more" size={16} stroke={2} color="var(--jd-muted)" />
      </div>
      <Link
        href={href}
        style={{
          display: "flex",
          gap: 11,
          padding: "8px 12px 12px",
          textDecoration: "none",
          color: "inherit",
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            className="jd-serif"
            style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.34, color: "var(--jd-ink)" }}
          >
            {headline}
          </div>
          <div
            className="jd-ui"
            style={{ fontSize: 11, fontWeight: 700, color: "var(--jd-navy)", marginTop: 6 }}
          >
            {ctaLabel} ›
          </div>
        </div>
        <div style={{ width: 88, flexShrink: 0, borderRadius: 2, overflow: "hidden" }}>
          <ArticleImage src={imageUrl} alt="" ratio="thumb" tone="field" />
        </div>
      </Link>
    </aside>
  );
}
