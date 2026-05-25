"use client";

import { useEffect, useState } from "react";
import type { CgRatesSnapshot } from "@/lib/super-menu/cg-rates";
import { pickBilingualLabel } from "@/lib/i18n/pick-label";
import { useLanguage } from "@/providers/LanguageProvider";
import { SuperMenuBlock } from "./SuperMenuBlock";

function formatUpdated(iso: string, language: string): string {
  try {
    const t = new Date(iso).toLocaleTimeString(
      language === "en" ? "en-IN" : "hi-IN",
      { hour: "2-digit", minute: "2-digit" }
    );
    return language === "en" ? `Updated ${t}` : `${t} अपडेट`;
  } catch {
    return "";
  }
}

function arrow(direction: string): string {
  if (direction === "up") return "↑";
  if (direction === "down") return "↓";
  return "→";
}

type SuperMenuCgRatesProps = {
  menuOpen: boolean;
};

export function SuperMenuCgRates({ menuOpen }: SuperMenuCgRatesProps) {
  const { language } = useLanguage();
  const open = menuOpen;
  const [snap, setSnap] = useState<CgRatesSnapshot | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/cg-rates", { cache: "default" });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as CgRatesSnapshot;
        if (!cancelled) setSnap(data);
      } catch {
        if (!cancelled) {
          const { getCachedCgDailyRates } = await import(
            "@/lib/super-menu/cg-rates"
          );
          setSnap(getCachedCgDailyRates());
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open]);

  const title = pickBilingualLabel(
    language,
    "CG Daily Rates",
    "छत्तीसगढ़ दैनिक दर"
  );

  return (
    <SuperMenuBlock id="sm-cg-rates" title={title}>
      {!snap ? (
        <div className="sm-rates sm-rates--loading" aria-hidden>
          {[1, 2, 3].map((i) => (
            <div key={i} className="sm-rates__row sm-rates__row--sk" />
          ))}
        </div>
      ) : (
        <>
          <p className="sm-rates__meta">{formatUpdated(snap.updatedAt, language)}</p>
          <ul className="sm-rates" role="list">
            {snap.rates.map((r) => (
              <li key={r.id} className="sm-rates__row" role="listitem">
                <span className="sm-rates__label">
                  {pickBilingualLabel(language, r.labelEn, r.labelHi)}
                </span>
                <span className="sm-rates__value">
                  {r.value}
                  <span
                    className={`sm-rates__chg sm-rates__chg--${r.direction}`}
                    aria-label={`${r.changePct >= 0 ? "+" : ""}${r.changePct.toFixed(2)} percent`}
                  >
                    {arrow(r.direction)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </SuperMenuBlock>
  );
}
