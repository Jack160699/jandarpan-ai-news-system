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
    <SuperMenuBlock id="sm-cg-rates" title={title} className="sm-block--tight">
      {!snap ? (
        <ul className="sm-rate-lines sm-rate-lines--loading" aria-hidden>
          {[1, 2, 3].map((i) => (
            <li key={i} className="sm-rate-line sm-rate-line--sk" />
          ))}
        </ul>
      ) : (
        <>
          <p className="sm-rate-lines__meta">
            {formatUpdated(snap.updatedAt, language)}
          </p>
          <ul className="sm-rate-lines" role="list">
            {snap.rates.map((r) => (
              <li key={r.id} className="sm-rate-line" role="listitem">
                <span className="sm-rate-line__label">
                  {pickBilingualLabel(language, r.labelEn, r.labelHi)}
                </span>
                <span className="sm-rate-line__dots" aria-hidden />
                <span className="sm-rate-line__value">
                  {r.value}
                  <span
                    className={`sm-rate-line__chg sm-rate-line__chg--${r.direction}`}
                    aria-hidden
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
