import Link from "next/link";
import { JdIcon } from "./icons";

/** "आज की 10 बड़ी खबरें" audio briefing call-to-action. No autoplay. */
export function AudioBriefingCta({
  href = "/listen",
  count = 10,
  duration = "8 मिनट",
}: {
  href?: string;
  count?: number;
  duration?: string;
}) {
  return (
    <Link
      href={href}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        margin: "12px 14px 0",
        padding: "12px 14px",
        background: "linear-gradient(135deg, var(--jd-navy), var(--jd-navy-deep))",
        borderRadius: "var(--jd-radius)",
        color: "var(--jd-paper)",
        minHeight: 44,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 40,
          height: 40,
          borderRadius: 40,
          background: "var(--jd-gold)",
          flexShrink: 0,
        }}
      >
        <JdIcon name="play" size={20} stroke={2} color="var(--jd-navy)" />
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span className="jd-serif" style={{ display: "block", fontSize: 15, fontWeight: 700 }}>
          आज की {count} बड़ी खबरें
        </span>
        <span className="jd-ui" style={{ fontSize: 11, color: "var(--jd-gold-soft)" }}>
          ऑडियो ब्रीफ़िंग · {duration}
        </span>
      </span>
      <JdIcon name="headphone" size={20} stroke={1.9} color="var(--jd-gold-soft)" />
    </Link>
  );
}
