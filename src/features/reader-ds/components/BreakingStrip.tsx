import Link from "next/link";
import { JdIcon } from "./icons";

type BreakingStripProps = {
  headline?: string | null;
  href?: string;
};

/** Conditional breaking-news strip — renders only when real breaking exists. */
export function BreakingStrip({ headline, href = "#" }: BreakingStripProps) {
  if (!headline || !headline.trim()) return null;
  return (
    <Link
      href={href}
      className="jd-ui"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 9,
        padding: "8px 14px",
        background: "var(--jd-red)",
        color: "#fff",
        minHeight: 40,
      }}
    >
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          fontSize: 9.5,
          fontWeight: 800,
          letterSpacing: ".12em",
          textTransform: "uppercase",
          background: "rgba(255,255,255,.16)",
          padding: "2px 7px",
          borderRadius: 2,
          flexShrink: 0,
        }}
      >
        <JdIcon name="bolt" size={12} stroke={2} color="#fff" />
        ब्रेकिंग
      </span>
      <span
        style={{
          fontSize: 12.5,
          fontWeight: 600,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {headline}
      </span>
    </Link>
  );
}
