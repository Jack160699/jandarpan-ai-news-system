/** Asia/Kolkata effective-date helpers for verified rates. */

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

export function toIstParts(date: Date = new Date()): {
  year: number;
  month: number;
  day: number;
  ymd: string;
} {
  const ist = new Date(date.getTime() + IST_OFFSET_MS);
  const year = ist.getUTCFullYear();
  const month = ist.getUTCMonth() + 1;
  const day = ist.getUTCDate();
  const ymd = `${year.toString().padStart(4, "0")}-${month
    .toString()
    .padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
  return { year, month, day, ymd };
}

export function effectiveDateIst(date: Date = new Date()): string {
  return toIstParts(date).ymd;
}

export function parseYmd(ymd: string): { year: number; month: number; day: number } | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return null;
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  return { year: y, month: m, day: d };
}

/** Add calendar days in a timezone-safe YMD space (no DST shift in IST). */
export function addDaysYmd(ymd: string, days: number): string | null {
  const parsed = parseYmd(ymd);
  if (!parsed) return null;
  // Use UTC noon as neutral carrier
  const utc = Date.UTC(parsed.year, parsed.month - 1, parsed.day, 12, 0, 0);
  const next = new Date(utc + days * 86_400_000);
  const y = next.getUTCFullYear();
  const m = next.getUTCMonth() + 1;
  const d = next.getUTCDate();
  return `${y.toString().padStart(4, "0")}-${m.toString().padStart(2, "0")}-${d
    .toString()
    .padStart(2, "0")}`;
}

export function diffDaysYmd(a: string, b: string): number | null {
  const pa = parseYmd(a);
  const pb = parseYmd(b);
  if (!pa || !pb) return null;
  const ua = Date.UTC(pa.year, pa.month - 1, pa.day, 12, 0, 0);
  const ub = Date.UTC(pb.year, pb.month - 1, pb.day, 12, 0, 0);
  return Math.round((ua - ub) / 86_400_000);
}

export function rangeStartYmd(endYmd: string, rangeDays: number): string | null {
  return addDaysYmd(endYmd, -(rangeDays - 1));
}

export function eachYmdInclusive(from: string, to: string): string[] {
  const out: string[] = [];
  let cursor: string | null = from;
  const guard = 400;
  let i = 0;
  while (cursor && i < guard) {
    out.push(cursor);
    if (cursor === to) break;
    cursor = addDaysYmd(cursor, 1);
    i += 1;
  }
  return out;
}
