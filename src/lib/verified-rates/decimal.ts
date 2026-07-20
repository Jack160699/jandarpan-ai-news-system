/**
 * Decimal-safe arithmetic using integer scaled math (string I/O).
 * Never emit NaN / undefined; reject non-positive prices at boundaries.
 */

const SCALE = BigInt(1_000_000);
const ZERO = BigInt(0);
const ONE = BigInt(1);
const TEN = BigInt(10);
const HUNDRED = BigInt(100);

function parseToScaled(value: string): bigint | null {
  const trimmed = value.trim();
  if (!/^-?\d+(\.\d+)?$/.test(trimmed)) return null;
  const negative = trimmed.startsWith("-");
  const raw = negative ? trimmed.slice(1) : trimmed;
  const [wholePart, fracPart = ""] = raw.split(".");
  if (!wholePart || !/^\d+$/.test(wholePart) || (fracPart && !/^\d+$/.test(fracPart))) {
    return null;
  }
  const frac = (fracPart + "000000").slice(0, 6);
  const scaled = BigInt(wholePart) * SCALE + BigInt(frac);
  return negative ? -scaled : scaled;
}

function scaledToString(scaled: bigint, decimals: number): string {
  const negative = scaled < ZERO;
  const abs = negative ? -scaled : scaled;
  const whole = abs / SCALE;
  const frac = abs % SCALE;
  const fracStr = frac.toString().padStart(6, "0");

  if (decimals >= 6) {
    const body = `${whole.toString()}.${fracStr}`;
    return negative ? `-${body}` : body;
  }

  if (decimals === 0) {
    const next = Number(fracStr[0] ?? "0");
    const bumped = whole + (next >= 5 ? ONE : ZERO);
    const body = bumped.toString();
    return negative ? `-${body}` : body;
  }

  const keepStr = fracStr.slice(0, decimals);
  const next = Number(fracStr[decimals] ?? "0");
  let keepNum = BigInt(keepStr || "0");
  if (next >= 5) keepNum += ONE;
  const base = TEN ** BigInt(decimals);
  let wholeOut = whole;
  if (keepNum >= base) {
    wholeOut += ONE;
    keepNum -= base;
  }
  const body = `${wholeOut.toString()}.${keepNum.toString().padStart(decimals, "0")}`;
  return negative ? `-${body}` : body;
}

export function isPositivePriceString(value: string): boolean {
  const scaled = parseToScaled(value);
  return scaled !== null && scaled > ZERO;
}

export function formatPrice(value: string, decimals: number): string | null {
  const scaled = parseToScaled(value);
  if (scaled === null || scaled <= ZERO) return null;
  return scaledToString(scaled, decimals);
}

export function diffPrices(a: string, b: string): string | null {
  const sa = parseToScaled(a);
  const sb = parseToScaled(b);
  if (sa === null || sb === null) return null;
  return scaledToString(sa - sb, 6);
}

export function percentChange(current: string, previous: string): string | null {
  const sc = parseToScaled(current);
  const sp = parseToScaled(previous);
  if (sc === null || sp === null || sp === ZERO) return null;
  const diff = sc - sp;
  const pctScaled = (diff * HUNDRED * SCALE) / sp;
  return scaledToString(pctScaled, 4);
}

export function comparePrices(a: string, b: string): number | null {
  const sa = parseToScaled(a);
  const sb = parseToScaled(b);
  if (sa === null || sb === null) return null;
  if (sa === sb) return 0;
  return sa > sb ? 1 : -1;
}

export function maxPrice(values: string[]): string | null {
  let best: bigint | null = null;
  let bestStr: string | null = null;
  for (const v of values) {
    const s = parseToScaled(v);
    if (s === null || s <= ZERO) continue;
    if (best === null || s > best) {
      best = s;
      bestStr = scaledToString(s, 6);
    }
  }
  return bestStr;
}

export function minPrice(values: string[]): string | null {
  let best: bigint | null = null;
  let bestStr: string | null = null;
  for (const v of values) {
    const s = parseToScaled(v);
    if (s === null || s <= ZERO) continue;
    if (best === null || s < best) {
      best = s;
      bestStr = scaledToString(s, 6);
    }
  }
  return bestStr;
}

export function roundForPresentation(value: string, decimals: number): string | null {
  return formatPrice(value, decimals);
}
