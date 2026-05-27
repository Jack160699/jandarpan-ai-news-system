"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { CgDailyRate, CgRatesSnapshot } from "@/lib/super-menu/cg-rates";
import type { NewsroomLanguage } from "@/lib/i18n/languages";
import { pickBilingualLabel } from "@/lib/i18n/pick-label";
import { useLanguage } from "@/providers/LanguageProvider";
import { SuperMenuBlock } from "./SuperMenuBlock";
import {
  FxExchangeIcon,
  FuelStationIcon,
  GoldBarIcon,
  SilverCoinIcon,
} from "./RateStripIcons";

type RateVisual = {
  tone: "gold" | "silver" | "fx" | "fuel";
  renderIcon: () => ReactNode;
  renderLabel: (language: NewsroomLanguage) => ReactNode;
};

const RATE_VISUALS: Record<CgDailyRate["id"], RateVisual> = {
  gold: {
    tone: "gold",
    renderIcon: () => <GoldBarIcon className="sm-rate-card__svg" />,
    renderLabel: (language) =>
      pickBilingualLabel(language, "Gold", "सोना"),
  },
  silver: {
    tone: "silver",
    renderIcon: () => <SilverCoinIcon className="sm-rate-card__svg" />,
    renderLabel: (language) =>
      pickBilingualLabel(language, "Silver", "चाँदी"),
  },
  usd: {
    tone: "fx",
    renderIcon: () => <FxExchangeIcon className="sm-rate-card__svg" />,
    renderLabel: () => (
      <span className="sm-rate-card__label-fx">
        <span>USD</span>
        <span className="sm-rate-card__label-sep" aria-hidden>
          /
        </span>
        <span>₹</span>
      </span>
    ),
  },
  petrol: {
    tone: "fuel",
    renderIcon: () => <FuelStationIcon className="sm-rate-card__svg" />,
    renderLabel: (language) =>
      pickBilingualLabel(language, "Petrol", "पेट्रोल"),
  },
};

function formatHeading(iso: string, language: NewsroomLanguage): string {
  try {
    const t = new Date(iso).toLocaleTimeString(
      language === "en" ? "en-IN" : "hi-IN",
      { hour: "2-digit", minute: "2-digit", hour12: true }
    );
    const title = pickBilingualLabel(
      language,
      "CG DAILY RATES",
      "छ.ग. दैनिक दर"
    );
    return language === "en"
      ? `${title} • Updated ${t}`
      : `${title} • ${t} अपडेट`;
  } catch {
    return pickBilingualLabel(language, "CG DAILY RATES", "छ.ग. दैनिक दर");
  }
}

function TrendMark({ direction }: { direction: string }) {
  if (direction === "up") {
    return (
      <svg className="sm-rate-card__trend" viewBox="0 0 12 12" aria-hidden>
        <path
          d="M6 2.5v7M3.5 6.5 6 4l2.5 2.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (direction === "down") {
    return (
      <svg className="sm-rate-card__trend" viewBox="0 0 12 12" aria-hidden>
        <path
          d="M6 9.5v-7M3.5 5.5 6 8l2.5-2.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg className="sm-rate-card__trend" viewBox="0 0 12 12" aria-hidden>
      <path
        d="M3 6h6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
    </svg>
  );
}

function RateCard({
  rate,
  language,
}: {
  rate: CgDailyRate;
  language: NewsroomLanguage;
}) {
  const visual = RATE_VISUALS[rate.id];
  const label = visual.renderLabel(language);
  const labelText =
    rate.id === "usd"
      ? "USD / ₹"
      : pickBilingualLabel(
          language,
          rate.id === "gold"
            ? "Gold"
            : rate.id === "silver"
              ? "Silver"
              : "Petrol",
          rate.id === "gold"
            ? "सोना"
            : rate.id === "silver"
              ? "चाँदी"
              : "पेट्रोल"
        );

  return (
    <li
      className={`sm-rate-card sm-rate-card--${visual.tone} tap-target`}
      role="listitem"
      aria-label={`${labelText} ${rate.value}`}
    >
      <span className="sm-rate-card__icon" aria-hidden>
        {visual.renderIcon()}
      </span>
      <span className="sm-rate-card__label">{label}</span>
      <span className="sm-rate-card__value-row">
        <span className="sm-rate-card__value">{rate.value}</span>
        <span
          className={`sm-rate-card__chg sm-rate-card__chg--${rate.direction}`}
          aria-hidden
        >
          <TrendMark direction={rate.direction} />
        </span>
      </span>
    </li>
  );
}

type SuperMenuCgRatesProps = {
  menuOpen: boolean;
};

export function SuperMenuCgRates({ menuOpen }: SuperMenuCgRatesProps) {
  const { language } = useLanguage();
  const [snap, setSnap] = useState<CgRatesSnapshot | null>(null);

  useEffect(() => {
    if (!menuOpen) return;
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
  }, [menuOpen]);

  return (
    <SuperMenuBlock id="sm-cg-rates" className="sm-block--tight sm-block--rates">
      <p className="sm-rates-strip__heading">
        {snap
          ? formatHeading(snap.updatedAt, language)
          : pickBilingualLabel(language, "CG DAILY RATES", "छ.ग. दैनिक दर")}
      </p>

      {!snap ? (
        <ul className="sm-rates-strip sm-rates-strip--loading" aria-hidden>
          {[1, 2, 3, 4].map((i) => (
            <li key={i} className="sm-rate-card sm-rate-card--sk" />
          ))}
        </ul>
      ) : (
        <ul className="sm-rates-strip" role="list">
          {snap.rates.map((r) => (
            <RateCard key={r.id} rate={r} language={language} />
          ))}
        </ul>
      )}
    </SuperMenuBlock>
  );
}
