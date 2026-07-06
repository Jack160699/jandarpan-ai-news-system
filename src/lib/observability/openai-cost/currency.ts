/**
 * USD ↔ INR display helpers for AI financial dashboard
 */

export type DualCurrency = {
  usd: number;
  inr: number;
};

export function getExchangeRate(): number {
  const raw = process.env.OPENAI_COST_EXCHANGE_RATE?.trim();
  const rate = raw ? Number(raw) : 86;
  return Number.isFinite(rate) && rate > 0 ? rate : 86;
}

export function usdToInr(usd: number, rate = getExchangeRate()): number {
  return round2(usd * rate);
}

export function toDualCurrency(usd: number, rate = getExchangeRate()): DualCurrency {
  return { usd: round4(usd), inr: round2(usd * rate) };
}

export function formatUsd(usd: number): string {
  return `$${round4(usd).toFixed(usd >= 1 ? 2 : 4)}`;
}

export function formatInr(inr: number): string {
  return `₹${inr.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatDualCurrency(usd: number, rate = getExchangeRate()): {
  usdLabel: string;
  inrLabel: string;
  dual: DualCurrency;
} {
  const dual = toDualCurrency(usd, rate);
  return {
    usdLabel: formatUsd(dual.usd),
    inrLabel: formatInr(dual.inr),
    dual,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
