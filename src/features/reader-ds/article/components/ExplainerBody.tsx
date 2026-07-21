type QaItem = { n: string; q: string; a: string };

function toQaItems(takeaways: string[], paragraphs: string[]): QaItem[] {
  const source = takeaways.length >= 2 ? takeaways : paragraphs.slice(0, 4);
  return source.slice(0, 5).map((text, i) => {
    const qMark = text.indexOf("?");
    if (qMark > 0 && qMark < 80) {
      return {
        n: String(i + 1),
        q: text.slice(0, qMark + 1).trim(),
        a: text.slice(qMark + 1).trim() || text,
      };
    }
    return {
      n: String(i + 1),
      q: `मुख्य बिंदु ${i + 1}`,
      a: text,
    };
  });
}

/** B16 — numbered Q&A from real takeaways/paragraphs. */
export function ExplainerBody({
  takeaways,
  paragraphs,
  stats,
}: {
  takeaways: string[];
  paragraphs: string[];
  stats: Array<{ value: string; label: string }>;
}) {
  const items = toQaItems(takeaways, paragraphs);
  return (
    <>
      {items.map((q) => (
        <div key={q.n} style={{ display: "flex", gap: 12, marginBottom: 16 }}>
          <div
            className="jd-brand"
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: "var(--jd-gold)",
              flexShrink: 0,
              width: 24,
              lineHeight: 1.1,
            }}
          >
            {q.n}
          </div>
          <div>
            <div
              className="jd-serif"
              style={{ fontSize: 16, fontWeight: 700, marginBottom: 5, color: "var(--jd-ink)" }}
            >
              {q.q}
            </div>
            <p
              className="jd-serif"
              style={{ margin: 0, fontSize: 14, lineHeight: 1.7, color: "var(--jd-ink-2)" }}
            >
              {q.a}
            </p>
          </div>
        </div>
      ))}
      {stats.length > 0 ? (
        <div
          style={{
            background: "var(--jd-navy)",
            color: "var(--jd-paper)",
            borderRadius: 3,
            padding: "14px 16px",
          }}
        >
          <div
            className="jd-ui"
            style={{
              fontSize: 10.5,
              color: "var(--jd-gold)",
              fontWeight: 800,
              letterSpacing: ".08em",
              marginBottom: 6,
            }}
          >
            एक नज़र में आँकड़े
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            {stats.slice(0, 3).map((x) => (
              <div key={x.label} style={{ textAlign: "center", flex: 1 }}>
                <div className="jd-ui" style={{ fontSize: 17, fontWeight: 800 }}>
                  {x.value}
                </div>
                <div className="jd-ui" style={{ fontSize: 10, color: "#8ea0c4" }}>
                  {x.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}
