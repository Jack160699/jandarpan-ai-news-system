/**
 * Publisher revenue-share ledger: pure rules. Money is integer paise (bigint-safe), never a float.
 *
 * Money moves between buckets (pending -> approved -> payable -> paid); every move is an immutable event. A balance is whatever the events
 * add up to. Corrections are new events (adjustment / reversal), never edits. The same rules are enforced in SQL by migration 101.
 */

export const BUCKETS = ["pending", "approved", "payable", "paid"] as const;
export type Bucket = (typeof BUCKETS)[number];
export type SourceBucket = Exclude<Bucket, "paid">;
export type EventKind = "accrual" | "approval" | "release_payable" | "payout" | "adjustment" | "reversal";

export type LedgerEvent = {
  id: number;
  accountId: string;
  articleId: string | null;
  kind: EventKind;
  from: SourceBucket | null;
  to: Bucket | null;
  amountPaise: number;
  reversesEventId: number | null;
  payoutId: string | null;
  idempotencyKey: string;
  reason: string | null;
  actorId: string | null;
  actorKind: "system" | "admin";
};

export type Balances = { pending: number; approved: number; payable: number; paid: number };
export const EMPTY_BALANCES: Balances = { pending: 0, approved: 0, payable: 0, paid: 0 };

export function balancesOf(events: readonly LedgerEvent[]): Balances {
  const b = { ...EMPTY_BALANCES };
  for (const e of events) {
    if (e.from) b[e.from] -= e.amountPaise;
    if (e.to) b[e.to] += e.amountPaise;
  }
  return b;
}

/** Share of attributed gross revenue owed to a contributor, rounded DOWN to a whole paisa (the house never over-pays by rounding). */
export function shareOf(grossPaise: number, shareBps: number): number {
  if (!Number.isSafeInteger(grossPaise) || grossPaise < 0) throw new RangeError("grossPaise must be a non-negative integer");
  if (!Number.isInteger(shareBps) || shareBps < 0 || shareBps > 10_000) throw new RangeError("shareBps must be 0..10000");
  return Number((BigInt(grossPaise) * BigInt(shareBps)) / BigInt(10_000));
}

/** Bucket shape each event kind must have. Mirrors the SQL CHECK. */
export const KIND_SHAPE: Record<Exclude<EventKind, "adjustment" | "reversal">, { from: SourceBucket | null; to: Bucket }> = {
  accrual: { from: null, to: "pending" },
  approval: { from: "pending", to: "approved" },
  release_payable: { from: "approved", to: "payable" },
  payout: { from: "payable", to: "paid" },
};

export const REASON_MIN = 5;

/** The opposite move of an event; null if it cannot be undone as a ledger move (money that has been paid out is terminal). */
export function inverseMove(e: Pick<LedgerEvent, "from" | "to">): { from: SourceBucket | null; to: Bucket | null } | null {
  if (e.to === "paid") return null;
  return { from: (e.to as SourceBucket | null) ?? null, to: e.from };
}
