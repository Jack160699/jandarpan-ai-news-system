/** B17 — drop-cap + optional pull-quote for opinion/editorial. */
export function OpinionBody({
  paragraphs,
  pullQuote,
}: {
  paragraphs: string[];
  pullQuote?: string | null;
}) {
  const first = paragraphs[0] ?? "";
  const rest = paragraphs.slice(1);
  const chars = Array.from(first);
  const drop = chars.slice(0, 2).join("") || "।";
  const after = chars.slice(2).join("");

  return (
    <>
      {first ? (
        <p
          className="jd-serif"
          style={{
            margin: "6px 0 12px",
            fontSize: 15.5,
            lineHeight: 1.8,
            color: "var(--jd-ink-2)",
          }}
        >
          <span
            className="jd-brand"
            style={{
              float: "left",
              fontSize: 52,
              lineHeight: 0.82,
              paddingRight: 8,
              color: "var(--jd-red)",
            }}
          >
            {drop}
          </span>
          {after}
        </p>
      ) : null}
      {pullQuote ? (
        <blockquote
          className="jd-serif"
          style={{
            margin: "14px 0",
            borderLeft: "3px solid var(--jd-gold)",
            paddingLeft: 14,
            fontSize: 18,
            lineHeight: 1.5,
            fontStyle: "italic",
            color: "var(--jd-navy)",
            fontWeight: 600,
          }}
        >
          {pullQuote.startsWith('"') || pullQuote.startsWith("“")
            ? pullQuote
            : `"${pullQuote}"`}
        </blockquote>
      ) : null}
      {rest.map((p, i) => (
        <p
          key={i}
          className="jd-serif"
          style={{
            margin: "0 0 12px",
            fontSize: 15,
            lineHeight: 1.75,
            color: "var(--jd-ink-2)",
          }}
        >
          {p}
        </p>
      ))}
    </>
  );
}
