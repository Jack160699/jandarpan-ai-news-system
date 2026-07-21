"use client";

import { useJdDsT } from "../i18n";
import type { A1RateTile } from "../data/a1-utilities";
import { buildHonestA1Rates } from "../data/a1-utilities";

type LegacyProps = {
  gold?: string | null;
  goldDelta?: string | null;
  silver?: string | null;
  silverDelta?: string | null;
  diesel?: string | null;
  dieselDelta?: string | null;
  tiles?: never;
};

type ContractProps = {
  tiles: A1RateTile[];
  gold?: never;
  goldDelta?: never;
  silver?: never;
  silverDelta?: never;
  diesel?: never;
  dieselDelta?: never;
};

type UtilTilesProps = LegacyProps | ContractProps;

/**
 * Market rate tiles — approved A1 homepage block.
 * Renders only honest live rates. Never invents market prices or % changes.
 * Prefer fewer real tiles over fake completeness.
 */
export function UtilTiles(props: UtilTilesProps = {}) {
  const { t, locale } = useJdDsT();

  let tiles: Array<{ key: string; lb: string; val: string; sub: string; color: string }> = [];

  if ("tiles" in props && props.tiles) {
    const honest = buildHonestA1Rates(props.tiles);
    tiles = honest.map((tile, i) => ({
      key: tile.id,
      lb: locale === "en" ? tile.labelEn : tile.labelHi,
      val: tile.value!,
      sub:
        (locale === "en" ? tile.changeLabelEn : tile.changeLabelHi) ??
        (tile.locationOrMarket ?? t("util.ratesAsOf")),
      color: i === 1 ? "var(--jd-red)" : i === 2 ? "var(--jd-ink-3)" : "var(--jd-navy)",
    }));
  } else {
    const { gold, goldDelta, silver, silverDelta, diesel, dieselDelta } = props as LegacyProps;
    // Legacy path: only render tiles that were explicitly supplied (no defaults).
    const candidates: Array<{ key: string; lb: string; val: string; sub: string; color: string }> =
      [];
    if (gold?.trim()) {
      candidates.push({
        key: "gold",
        lb: t("util.rateGold"),
        val: gold.trim(),
        sub: goldDelta?.trim() || t("util.ratesAsOf"),
        color: "var(--jd-navy)",
      });
    }
    if (silver?.trim()) {
      candidates.push({
        key: "silver",
        lb: t("util.rateSilver"),
        val: silver.trim(),
        sub: silverDelta?.trim() || t("util.ratesAsOf"),
        color: "var(--jd-red)",
      });
    }
    if (diesel?.trim()) {
      candidates.push({
        key: "diesel",
        lb: t("util.rateDiesel"),
        val: diesel.trim(),
        sub: dieselDelta?.trim() || t("util.ratesAsOf"),
        color: "var(--jd-ink-3)",
      });
    }
    tiles = candidates;
  }

  if (tiles.length === 0) return null;

  const cols = Math.min(3, tiles.length);

  return (
    <div
      className="jd-ui jd-util-tiles"
      data-jd-rates-count={tiles.length}
      style={{
        margin: "2px 14px",
        display: "grid",
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: 1,
        background: "var(--jd-line-2)",
        border: "1px solid var(--jd-line-2)",
      }}
      aria-label={t("util.ratesAria")}
    >
      {tiles.map((tile) => (
        <div key={tile.key} style={{ background: "#fff", padding: "8px 10px" }}>
          <div style={{ fontSize: 9.5, color: "var(--jd-muted)", fontWeight: 600 }}>{tile.lb}</div>
          <div style={{ fontSize: 14, fontWeight: 800, color: "var(--jd-ink)", margin: "1px 0" }}>
            {tile.val}
          </div>
          <div style={{ fontSize: 10, fontWeight: 700, color: tile.color }}>{tile.sub}</div>
        </div>
      ))}
    </div>
  );
}
