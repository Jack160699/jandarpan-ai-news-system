import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { KIND_SHAPE, balancesOf, inverseMove, shareOf, type LedgerEvent } from "@/lib/publisher-revenue/ledger";
import { publisherRevenueEnabled } from "@/lib/publisher-revenue/flag";
import { accrue, adjust, approve, balancesFor, recordPayout, releasePayable, reverse, type Actor, type NewEvent, type RevenueAccount, type RevenueDeps, type RevenueRepo } from "@/lib/publisher-revenue/service";

const ADMIN: Actor = { id: "admin-1", role: "super_admin" };
const EDITOR: Actor = { id: "ed-1", role: "editor" };

/** In-memory ledger that re-implements the database invariants (idempotency, no overdraw, reverse-once, payout-ready). */
function memory(opts: { account?: Partial<RevenueAccount>; verified?: boolean; published?: boolean } = {}) {
  const events: LedgerEvent[] = [];
  const payouts: Array<{ id: string; amount: number }> = [];
  const account: RevenueAccount = { userId: "u1", shareBps: 5000, status: "active", payoutReady: true, ...opts.account };
  let seq = 0;
  const repo: RevenueRepo = {
    getAccount: async (id) => (id === account.userId ? account : null),
    contributorOf: async (articleId) => (articleId.startsWith("art") ? { authorId: "u1", publiclyPublished: opts.published ?? true, authorVerified: opts.verified ?? true } : null),
    listEvents: async (id) => events.filter((e) => e.accountId === id),
    getEvent: async (id) => events.find((e) => e.id === id) ?? null,
    append: async (e: NewEvent) => {
      if (events.some((x) => x.idempotencyKey === e.idempotencyKey)) return { ok: false, code: "duplicate" };
      if (e.reversesEventId !== null && events.some((x) => x.reversesEventId === e.reversesEventId)) return { ok: false, code: "already_reversed" };
      if (e.kind === "payout" && !(account.status === "active" && account.payoutReady)) return { ok: false, code: "payout_not_ready" };
      if (e.from && balancesOf(events.filter((x) => x.accountId === e.accountId))[e.from] < e.amountPaise) return { ok: false, code: "insufficient_balance" };
      const event = { ...e, id: ++seq };
      events.push(event);
      return { ok: true, event };
    },
    createPayout: async (_a, amount) => {
      const id = `p${payouts.length + 1}`;
      payouts.push({ id, amount });
      return id;
    },
  };
  const deps: RevenueDeps = { repo, enabled: true };
  return { deps, events, payouts, account };
}

describe("feature flag: OFF by default and exact", () => {
  it("only the string 'true' enables it", () => {
    expect(publisherRevenueEnabled({})).toBe(false);
    for (const v of ["1", "on", "TRUE", "yes", ""]) expect(publisherRevenueEnabled({ PUBLISHER_REVENUE_SHARE_ENABLED: v })).toBe(false);
    expect(publisherRevenueEnabled({ PUBLISHER_REVENUE_SHARE_ENABLED: "true" })).toBe(true);
  });

  it("every operation is refused while disabled and writes nothing", async () => {
    const m = memory();
    const off: RevenueDeps = { ...m.deps, enabled: false };
    const results = await Promise.all([
      accrue(off, { articleId: "art1", day: "2026-10-01", grossPaise: 10_000 }),
      approve(off, ADMIN, "u1", 1, "k"),
      releasePayable(off, ADMIN, "u1", 1, "k"),
      recordPayout(off, ADMIN, { accountId: "u1", amountPaise: 1, externalRef: null, key: "k" }),
      adjust(off, ADMIN, { accountId: "u1", bucket: "pending", amountPaise: 5, reason: "manual fix", key: "k" }),
      reverse(off, ADMIN, { eventId: 1, reason: "manual fix", key: "k" }),
    ]);
    for (const r of results) expect(r).toMatchObject({ ok: false, code: "feature_disabled" });
    expect(m.events).toHaveLength(0);
  });
});

describe("revenue split", () => {
  it("rounds down in whole paise and rejects bad input", () => {
    expect(shareOf(10_000, 5000)).toBe(5000);
    expect(shareOf(333, 5000)).toBe(166); // 166.5 -> 166: never over-pay
    expect(shareOf(1, 9999)).toBe(0);
    expect(shareOf(Number.MAX_SAFE_INTEGER, 10_000)).toBe(Number.MAX_SAFE_INTEGER);
    expect(() => shareOf(-1, 100)).toThrow();
    expect(() => shareOf(1.5, 100)).toThrow();
    expect(() => shareOf(100, 10_001)).toThrow();
  });
});

describe("accrual and attribution", () => {
  it("credits the contributor's share to pending, once per article per day", async () => {
    const m = memory();
    expect(await accrue(m.deps, { articleId: "art1", day: "2026-10-01", grossPaise: 10_000 })).toMatchObject({ ok: true, amountPaise: 5000 });
    expect(await accrue(m.deps, { articleId: "art1", day: "2026-10-01", grossPaise: 10_000 })).toMatchObject({ ok: true, eventId: null }); // retry is a no-op
    expect(await accrue(m.deps, { articleId: "art1", day: "2026-10-02", grossPaise: 2_000 })).toMatchObject({ ok: true, amountPaise: 1000 });
    expect(await balancesFor(m.deps, "u1")).toEqual({ pending: 6000, approved: 0, payable: 0, paid: 0 });
  });

  it("pays nothing for staff articles, taken-down stories, unverified authors or inactive accounts", async () => {
    expect(await accrue(memory().deps, { articleId: "staff-1", day: "2026-10-01", grossPaise: 1000 })).toMatchObject({ ok: false, code: "not_found" });
    expect(await accrue(memory({ published: false }).deps, { articleId: "art1", day: "2026-10-01", grossPaise: 1000 })).toMatchObject({ ok: false, code: "ineligible" });
    expect(await accrue(memory({ verified: false }).deps, { articleId: "art1", day: "2026-10-01", grossPaise: 1000 })).toMatchObject({ ok: false, code: "ineligible" });
    expect(await accrue(memory({ account: { status: "suspended" } }).deps, { articleId: "art1", day: "2026-10-01", grossPaise: 1000 })).toMatchObject({ ok: false, code: "ineligible" });
    expect(await accrue(memory({ account: { shareBps: 0 } }).deps, { articleId: "art1", day: "2026-10-01", grossPaise: 1000 })).toMatchObject({ ok: false, code: "ineligible" });
  });

  it("rejects malformed days and negative amounts", async () => {
    const m = memory();
    expect(await accrue(m.deps, { articleId: "art1", day: "yesterday", grossPaise: 1 })).toMatchObject({ code: "invalid" });
    expect(await accrue(m.deps, { articleId: "art1", day: "2026-10-01", grossPaise: -5 })).toMatchObject({ code: "invalid" });
  });
});

describe("lifecycle pending -> approved -> payable -> paid", () => {
  async function funded() {
    const m = memory();
    await accrue(m.deps, { articleId: "art1", day: "2026-10-01", grossPaise: 20_000 }); // 10_000 pending
    return m;
  }

  it("moves money step by step and never past what is in the source bucket", async () => {
    const m = await funded();
    expect(await approve(m.deps, ADMIN, "u1", 6000, "a1")).toMatchObject({ ok: true });
    expect(await approve(m.deps, ADMIN, "u1", 5000, "a2")).toMatchObject({ ok: false, code: "insufficient_balance" });
    expect(await releasePayable(m.deps, ADMIN, "u1", 7000, "r1")).toMatchObject({ ok: false, code: "insufficient_balance" });
    expect(await releasePayable(m.deps, ADMIN, "u1", 6000, "r2")).toMatchObject({ ok: true });
    expect(await recordPayout(m.deps, ADMIN, { accountId: "u1", amountPaise: 6001, externalRef: null, key: "p0" })).toMatchObject({ code: "insufficient_balance" });
    expect(await recordPayout(m.deps, ADMIN, { accountId: "u1", amountPaise: 6000, externalRef: "UTR123", key: "p1" })).toMatchObject({ ok: true });
    expect(await balancesFor(m.deps, "u1")).toEqual({ pending: 4000, approved: 0, payable: 0, paid: 6000 });
    expect(m.payouts).toHaveLength(1);
  });

  it("is idempotent on retry: the same key cannot move money twice", async () => {
    const m = await funded();
    expect(await approve(m.deps, ADMIN, "u1", 1000, "same")).toMatchObject({ ok: true });
    expect(await approve(m.deps, ADMIN, "u1", 1000, "same")).toMatchObject({ ok: false, code: "duplicate" });
    expect((await balancesFor(m.deps, "u1")).approved).toBe(1000);
  });

  it("refuses payouts to an account that is not payout-ready, and records no payout row", async () => {
    const m = memory({ account: { payoutReady: false } });
    await accrue(m.deps, { articleId: "art1", day: "2026-10-01", grossPaise: 20_000 });
    await approve(m.deps, ADMIN, "u1", 10_000, "a");
    await releasePayable(m.deps, ADMIN, "u1", 10_000, "r");
    expect(await recordPayout(m.deps, ADMIN, { accountId: "u1", amountPaise: 100, externalRef: null, key: "p" })).toMatchObject({ code: "payout_not_ready" });
    expect(m.payouts).toHaveLength(0);
  });

  it("only a super-admin can move, adjust, reverse or pay", async () => {
    const m = await funded();
    for (const who of [EDITOR, { id: "m", role: "moderator" } as Actor, { id: "j", role: "journalist" } as Actor, { id: "a", role: "admin" } as Actor]) {
      expect(await approve(m.deps, who, "u1", 1, `k-${who.id}`)).toMatchObject({ code: "forbidden" });
      expect(await recordPayout(m.deps, who, { accountId: "u1", amountPaise: 1, externalRef: null, key: `p-${who.id}` })).toMatchObject({ code: "forbidden" });
      expect(await adjust(m.deps, who, { accountId: "u1", bucket: "pending", amountPaise: 1, reason: "no right", key: `j-${who.id}` })).toMatchObject({ code: "forbidden" });
      expect(await reverse(m.deps, who, { eventId: 1, reason: "no right", key: `v-${who.id}` })).toMatchObject({ code: "forbidden" });
    }
    expect((await balancesFor(m.deps, "u1")).approved).toBe(0);
  });
});

describe("adjustments and reversals", () => {
  it("adjustments need a reason and can credit or debit, but never overdraw", async () => {
    const m = memory();
    expect(await adjust(m.deps, ADMIN, { accountId: "u1", bucket: "pending", amountPaise: 500, reason: "x", key: "k0" })).toMatchObject({ code: "invalid" });
    expect(await adjust(m.deps, ADMIN, { accountId: "u1", bucket: "pending", amountPaise: 500, reason: "manual credit for correction", key: "k1" })).toMatchObject({ ok: true });
    expect(await adjust(m.deps, ADMIN, { accountId: "u1", bucket: "pending", amountPaise: -200, reason: "invalid traffic removed", key: "k2" })).toMatchObject({ ok: true });
    expect(await adjust(m.deps, ADMIN, { accountId: "u1", bucket: "pending", amountPaise: -400, reason: "invalid traffic removed", key: "k3" })).toMatchObject({ code: "insufficient_balance" });
    expect(await adjust(m.deps, ADMIN, { accountId: "u1", bucket: "pending", amountPaise: 0, reason: "nothing to do", key: "k4" })).toMatchObject({ code: "invalid" });
    expect((await balancesFor(m.deps, "u1")).pending).toBe(300);
  });

  it("reverses an accrual once, with a reason; double reversal and reversing a reversal are refused", async () => {
    const m = memory();
    await accrue(m.deps, { articleId: "art1", day: "2026-10-01", grossPaise: 10_000 });
    const accrual = m.events[0]!;
    expect(await reverse(m.deps, ADMIN, { eventId: accrual.id, reason: "x", key: "v0" })).toMatchObject({ code: "invalid" });
    const r = await reverse(m.deps, ADMIN, { eventId: accrual.id, reason: "fraudulent traffic", key: "v1" });
    expect(r).toMatchObject({ ok: true });
    expect((await balancesFor(m.deps, "u1")).pending).toBe(0);
    expect(await reverse(m.deps, ADMIN, { eventId: accrual.id, reason: "again please", key: "v2" })).toMatchObject({ code: "already_reversed" });
    expect(await reverse(m.deps, ADMIN, { eventId: (r as { eventId: number }).eventId, reason: "undo the undo", key: "v3" })).toMatchObject({ code: "invalid" });
  });

  it("cannot reverse an accrual whose money has already moved on, and never reverses paid money", async () => {
    const m = memory();
    await accrue(m.deps, { articleId: "art1", day: "2026-10-01", grossPaise: 10_000 });
    const accrual = m.events[0]!;
    await approve(m.deps, ADMIN, "u1", 5000, "a");
    expect(await reverse(m.deps, ADMIN, { eventId: accrual.id, reason: "fraudulent traffic", key: "v" })).toMatchObject({ code: "insufficient_balance" });
    await releasePayable(m.deps, ADMIN, "u1", 5000, "r");
    const paid = await recordPayout(m.deps, ADMIN, { accountId: "u1", amountPaise: 5000, externalRef: null, key: "p" });
    expect(paid).toMatchObject({ ok: true });
    const payoutEvent = m.events.find((e) => e.kind === "payout")!;
    expect(await reverse(m.deps, ADMIN, { eventId: payoutEvent.id, reason: "bank bounced it", key: "vp" })).toMatchObject({ code: "invalid" });
    expect(inverseMove(payoutEvent)).toBeNull();
  });
});

describe("ledger invariants hold under random operation sequences", () => {
  it("balances never go negative and money is conserved", async () => {
    let seed = 20261007;
    const rnd = (n: number) => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed % n;
    };
    for (let run = 0; run < 25; run++) {
      const m = memory();
      let credited = 0;
      for (let i = 0; i < 60; i++) {
        const k = `k${run}-${i}`;
        switch (rnd(7)) {
          case 0: {
            const r = await accrue(m.deps, { articleId: "art1", day: `2026-10-${String(1 + rnd(28)).padStart(2, "0")}`, grossPaise: rnd(50_000) });
            if (r.ok && "eventId" in r && r.eventId !== null) credited += r.amountPaise;
            break;
          }
          case 1:
            await approve(m.deps, ADMIN, "u1", 1 + rnd(8000), k);
            break;
          case 2:
            await releasePayable(m.deps, ADMIN, "u1", 1 + rnd(8000), k);
            break;
          case 3:
            await recordPayout(m.deps, ADMIN, { accountId: "u1", amountPaise: 1 + rnd(8000), externalRef: null, key: k });
            break;
          case 4: {
            const credit = rnd(2) === 0;
            const amt = 1 + rnd(2000);
            const r = await adjust(m.deps, ADMIN, { accountId: "u1", bucket: (["pending", "approved", "payable"] as const)[rnd(3)]!, amountPaise: credit ? amt : -amt, reason: "random test adjustment", key: k });
            if (r.ok) credited += credit ? amt : -amt;
            break;
          }
          case 5:
            if (m.events.length) {
              const target = m.events[rnd(m.events.length)]!;
              const r = await reverse(m.deps, ADMIN, { eventId: target.id, reason: "random test reversal", key: k });
              // reversing an external credit (no source bucket) removes it; reversing an external debit (no target bucket) restores it; internal moves net to zero
              if (r.ok) credited += (!target.from ? -target.amountPaise : 0) + (!target.to ? target.amountPaise : 0);
            }
            break;
          default:
            break;
        }
        const b = await balancesFor(m.deps, "u1");
        for (const v of Object.values(b)) expect(v).toBeGreaterThanOrEqual(0);
      }
      // conservation: what is held across all four buckets equals net external credits (accruals + adjustments + reversals)
      const b = balancesOf(m.events);
      expect(b.pending + b.approved + b.payable + b.paid).toBe(credited);
    }
  });
});

describe("kind shapes mirror the SQL constraint", () => {
  const sql = fs.readFileSync(path.resolve(__dirname, "../../../supabase/migrations/20261007020000_101_publisher_revenue_ledger.sql"), "utf8");

  it("each fixed-shape kind in TypeScript appears with the same buckets in the CHECK", () => {
    for (const [kind, shape] of Object.entries(KIND_SHAPE)) {
      const from = shape.from === null ? "from_bucket is null" : `from_bucket = '${shape.from}'`;
      expect(sql, kind).toMatch(new RegExp(`kind = '${kind}'\\s+and ${from}\\s+and to_bucket = '${shape.to}'`));
    }
  });

  it("the migration carries the money invariants", () => {
    expect(sql).toMatch(/publisher_revenue_events_append_only/);
    expect(sql).toMatch(/publisher_revenue_no_overdraw/);
    expect(sql).toMatch(/publisher_revenue_events_reversed_once/);
    expect(sql).toMatch(/create unique index if not exists publisher_revenue_events_idem/);
    expect(sql).toMatch(/amount_paise\s+bigint not null check \(amount_paise > 0\)/);
    expect(sql).toMatch(/revoke insert, update, delete on[\s\S]*from authenticated/);
    expect(sql).not.toMatch(/\b(float|double precision|real)\b|numeric\(/i); // money is integer paise
  });
});
