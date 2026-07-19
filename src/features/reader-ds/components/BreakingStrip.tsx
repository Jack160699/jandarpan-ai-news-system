import Link from "next/link";

type BreakingStripProps = {
  headline?: string | null;
  href?: string;
};

/**
 * Conditional breaking strip — white “ब्रेकिंग” badge + red-dot + serif ellipsis
 * (approved A1 atom). Renders nothing when no real breaking headline.
 */
export function BreakingStrip({ headline, href = "#" }: BreakingStripProps) {
  if (!headline || !headline.trim()) return null;
  return (
    <Link
      href={href}
      className="jd-ui"
      style={{
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        gap: 9,
        padding: "7px 14px",
        background: "var(--jd-red)",
        color: "#fff",
        textDecoration: "none",
      }}
    >
      <span
        style={{
          fontWeight: 800,
          fontSize: 10,
          letterSpacing: ".08em",
          background: "#fff",
          color: "var(--jd-red)",
          padding: "2px 7px",
          borderRadius: 2,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          gap: 3,
        }}
      >
        <span
          aria-hidden
          style={{
            width: 5,
            height: 5,
            borderRadius: 5,
            background: "var(--jd-red)",
            display: "inline-block",
          }}
        />
        ब्रेकिंग
      </span>
      <span
        className="jd-serif"
        style={{
          fontSize: 13,
          fontWeight: 600,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          color: "#fff",
        }}
      >
        {headline}
      </span>
    </Link>
  );
}
