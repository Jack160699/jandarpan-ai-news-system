import "server-only";

import { seriesKeyFrom } from "@/lib/verified-rates/catalog";
import type { RateProvider } from "@/lib/verified-rates/providers/types";
import type { RateCategory } from "@/lib/verified-rates/types";
import { isPositivePriceString } from "@/lib/verified-rates/decimal";
import { effectiveDateIst } from "@/lib/verified-rates/dates";

const BULLION: RateCategory[] = ["gold_24k", "gold_22k", "silver_999"];

const ALLOWED_HOSTS = new Set([
  "www.indiagoldratesapi.com",
  "indiagoldratesapi.com",
]);

type IbjaRow = {
  RateDate?: string;
  RateTime?: string;
  Purity?: string;
  GoldRate?: string;
  SilverRate?: string;
};

function parseIbjaDate(ddmmyyyy: string | undefined): string | null {
  if (!ddmmyyyy || !/^\d{2}\/\d{2}\/\d{4}$/.test(ddmmyyyy)) return null;
  const [d, m, y] = ddmmyyyy.split("/");
  return `${y}-${m}-${d}`;
}

/**
 * IBJA Rates API adapter — gated by ACCESS_TOKEN + written display consent.
 * Without both, returns blocked. Never scrapes jeweller sites.
 */
export const bullionIbjaProvider: RateProvider = {
  id: "bullion_ibja",
  family: "ibja",
  supports: (category: RateCategory) => BULLION.includes(category),
  async fetch(input) {
    const series = seriesKeyFrom({ category: input.category, citySlug: null });
    if (!series) {
      return {
        status: "error",
        code: "unsupported_combination",
        series: {
          category: input.category,
          geoScope: "state",
          citySlug: null,
          stateCode: "CG",
          countryCode: "IN",
          purity: null,
          unit: "10g",
          taxBasis: "ex_gst_benchmark",
        },
      };
    }

    const token = process.env.IBJA_ACCESS_TOKEN?.trim();
    const consent = process.env.IBJA_DISPLAY_CONSENT === "1";
    const enabled = process.env.VERIFIED_RATES_BULLION_ENABLED === "1";

    if (!enabled || !token || !consent) {
      return {
        status: "blocked",
        code: !consent
          ? "ibja_display_consent_missing"
          : !token
            ? "ibja_token_missing"
            : "bullion_not_enabled",
        series,
      };
    }

    const endpoint =
      process.env.IBJA_RATES_URL?.trim() ||
      "https://www.indiagoldratesapi.com/api/Rates";

    let url: URL;
    try {
      url = new URL(endpoint);
    } catch {
      return { status: "error", code: "ibja_bad_endpoint", series };
    }
    if (!ALLOWED_HOSTS.has(url.hostname)) {
      return { status: "error", code: "ibja_host_not_allowlisted", series };
    }
    url.searchParams.set("ACCESS_TOKEN", token);

    for (let attempt = 0; attempt < 2; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 12_000);
      const signal = input.signal ?? controller.signal;
      try {
        const res = await fetch(url.toString(), {
          signal,
          headers: { Accept: "application/json" },
          redirect: "error",
          cache: "no-store",
        });
        clearTimeout(timer);
        if (!res.ok) {
          if (attempt === 0 && res.status >= 500) continue;
          return { status: "unavailable", code: `ibja_http_${res.status}`, series };
        }
        const payload = (await res.json()) as IbjaRow[] | IbjaRow;
        const rows = Array.isArray(payload) ? payload : [payload];
        if (!rows.length) {
          return { status: "unavailable", code: "ibja_empty", series };
        }

        const purityWanted =
          input.category === "gold_22k" ? "916" : input.category === "gold_24k" ? "999" : "999";

        let chosen: IbjaRow | null = null;
        for (const row of rows) {
          if (input.category === "silver_999") {
            if (row.SilverRate && isPositivePriceString(String(row.SilverRate))) {
              chosen = row;
              break;
            }
          } else if (String(row.Purity ?? "") === purityWanted && row.GoldRate) {
            chosen = row;
            break;
          }
        }
        if (!chosen) {
          return { status: "unavailable", code: "ibja_purity_miss", series };
        }

        const price =
          input.category === "silver_999"
            ? String(chosen.SilverRate)
            : String(chosen.GoldRate);
        if (!isPositivePriceString(price)) {
          return { status: "unavailable", code: "ibja_invalid_price", series };
        }

        const rateTime = String(chosen.RateTime ?? "");
        const sessionLabel =
          /pm|18|evening|closing/i.test(rateTime)
            ? "closing"
            : /am|12|opening/i.test(rateTime)
              ? "opening"
              : "day";

        const ymd = parseIbjaDate(chosen.RateDate) ?? effectiveDateIst();

        return {
          status: "ok",
          series,
          priceNumeric: price,
          currency: "INR",
          sourceId: "bullion_ibja",
          sourceFamily: "ibja",
          sourceReportedAt: `${ymd}T12:30:00+05:30`,
          sessionLabel,
          validUntil: null,
        };
      } catch {
        clearTimeout(timer);
        if (attempt === 0) continue;
        return { status: "error", code: "ibja_fetch_failed", series };
      }
    }

    return { status: "unavailable", code: "ibja_adapter_exhausted", series };
  },
};
