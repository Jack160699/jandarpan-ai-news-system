/**
 * Gold / silver / diesel utility tiles — approved A1 homepage block.
 * Renders only when live rates are supplied. Never invents market prices.
 */
export function UtilTiles({
  gold,
  goldDelta,
  silver,
  silverDelta,
  diesel,
  dieselDelta,
}: {
  gold?: string | null;
  goldDelta?: string | null;
  silver?: string | null;
  silverDelta?: string | null;
  diesel?: string | null;
  dieselDelta?: string | null;
} = {}) {
  if (!gold || !silver || !diesel) return null;

  const tiles: Array<{ lb: string; val: string; sub: string; color: string }> = [
    { lb: "सोना 24K", val: gold, sub: goldDelta ?? "—", color: "var(--jd-navy)" },
    { lb: "चांदी", val: silver, sub: silverDelta ?? "—", color: "var(--jd-red)" },
    { lb: "डीज़ल", val: diesel, sub: dieselDelta ?? "—", color: "var(--jd-ink-3)" },
  ];

  return (
    <div
      className="jd-ui jd-util-tiles"
      style={{
        margin: "2px 14px",
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr",
        gap: 1,
        background: "var(--jd-line-2)",
        border: "1px solid var(--jd-line-2)",
      }}
      aria-label="बाजार भाव"
    >
      {tiles.map((t) => (
        <div key={t.lb} style={{ background: "#fff", padding: "8px 10px" }}>
          <div style={{ fontSize: 9.5, color: "var(--jd-muted)", fontWeight: 600 }}>{t.lb}</div>
          <div style={{ fontSize: 14, fontWeight: 800, color: "var(--jd-ink)", margin: "1px 0" }}>{t.val}</div>
          <div style={{ fontSize: 10, fontWeight: 700, color: t.color }}>{t.sub}</div>
        </div>
      ))}
    </div>
  );
}
