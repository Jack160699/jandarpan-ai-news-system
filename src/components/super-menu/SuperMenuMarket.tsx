"use client";

import { useEffect, useState } from "react";
import { Activity, BarChart3 } from "lucide-react";
import {
  buildMarketSnapshot,
  type MarketSnapshot,
} from "@/lib/super-menu/market-data";
import { labelForLink } from "@/lib/super-menu/config";
import { pickBilingualLabel } from "@/lib/i18n/pick-label";
import { useLanguage } from "@/providers/LanguageProvider";
import { MiniSparkline } from "./MiniSparkline";
import { SuperMenuSection } from "./SuperMenuSection";

function formatPct(pct: number, language: "en" | string): string {
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(2)}%`;
}

function formatUpdated(iso: string, language: string): string {
  try {
    const d = new Date(iso);
    const t = d.toLocaleTimeString(language === "en" ? "en-IN" : "hi-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
    return language === "en" ? `Updated ${t}` : `${t} अपडेट`;
  } catch {
    return "";
  }
}

export function SuperMenuMarket() {
  const { language } = useLanguage();
  const [snap, setSnap] = useState<MarketSnapshot | null>(null);

  useEffect(() => {
    setSnap(buildMarketSnapshot());
    const id = window.setInterval(() => setSnap(buildMarketSnapshot()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  if (!snap) return null;

  return (
    <>
      <SuperMenuSection
        id="sm-market"
        title={pickBilingualLabel(language, "Live Market", "लाइव मार्केट")}
        subtitle={formatUpdated(snap.updatedAt, language)}
        icon={<BarChart3 size={16} strokeWidth={2} />}
        defaultOpen
      >
        <div className="sm-market-scroll" role="list">
          {[...snap.indices, ...snap.global].map((q) => (
            <article key={q.id} className="sm-quote-card" role="listitem">
              <div className="sm-quote-card__top">
                <span className="sm-quote-card__label">
                  {labelForLink(q, language)}
                </span>
                <span
                  className={`sm-quote-card__chg sm-quote-card__chg--${q.direction}`}
                >
                  {formatPct(q.changePct, language)}
                </span>
              </div>
              <p className="sm-quote-card__value">
                {q.value}
                {q.unit ? (
                  <span className="sm-quote-card__unit">{q.unit}</span>
                ) : null}
              </p>
              <MiniSparkline points={q.spark} direction={q.direction} />
            </article>
          ))}
        </div>
      </SuperMenuSection>

      <SuperMenuSection
        id="sm-cg-market"
        title={pickBilingualLabel(
          language,
          "Chhattisgarh Market Watch",
          "छत्तीसगढ़ मार्केट वॉच"
        )}
        icon={<Activity size={16} strokeWidth={2} />}
        defaultOpen={false}
      >
        <p className="sm-feed__hint">
          {pickBilingualLabel(language, "Fuel & mandi", "ईंधन और मंडी")}
        </p>
        <div className="sm-market-scroll sm-market-scroll--compact" role="list">
          {[...snap.cgFuel, ...snap.cgMandi].map((c) => (
            <article key={c.id} className="sm-cg-card" role="listitem">
              <span className="sm-cg-card__city">
                {pickBilingualLabel(language, c.cityEn, c.cityHi)}
              </span>
              <span className="sm-cg-card__label">
                {pickBilingualLabel(language, c.labelEn, c.labelHi)}
              </span>
              <span className="sm-cg-card__value">{c.value}</span>
              <span
                className={`sm-quote-card__chg sm-quote-card__chg--${c.direction}`}
              >
                {formatPct(c.changePct, language)}
              </span>
            </article>
          ))}
        </div>
      </SuperMenuSection>

      <SuperMenuSection
        id="sm-stocks"
        title={pickBilingualLabel(language, "Market Live", "मार्केट लाइव")}
        defaultOpen={false}
      >
        <div className="sm-movers">
          <div>
            <p className="sm-movers__label">
              {pickBilingualLabel(language, "Top gainers", "टॉप गेनर्स")}
            </p>
            <ul className="sm-movers__list">
              {snap.gainers.map((s) => (
                <li key={s.symbol} className="sm-mover sm-mover--up">
                  <span>{pickBilingualLabel(language, s.nameEn, s.nameHi)}</span>
                  <span>{formatPct(s.changePct, language)}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="sm-movers__label">
              {pickBilingualLabel(language, "Top losers", "टॉप लूज़र्स")}
            </p>
            <ul className="sm-movers__list">
              {snap.losers.map((s) => (
                <li key={s.symbol} className="sm-mover sm-mover--down">
                  <span>{pickBilingualLabel(language, s.nameEn, s.nameHi)}</span>
                  <span>{formatPct(s.changePct, language)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </SuperMenuSection>
    </>
  );
}
