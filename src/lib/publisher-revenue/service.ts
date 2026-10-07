/**
 * Publisher revenue-share service. Every operation is refused while the feature flag is OFF, and every money-moving operation after the
 * accrual needs an admin actor. It never talks to a payment provider: `recordPayout` only RECORDS that money was paid outside the app.
 */
import { REASON_MIN, balancesOf, inverseMove, shareOf, type Balances, type EventKind, type LedgerEvent, type SourceBucket } from "@/lib/publisher-revenue/ledger";

export type RevenueAccount = { userId: string; shareBps: number; status: "inactive" | "active" | "suspended"; payoutReady: boolean };
export type NewEvent = Omit<LedgerEvent, "id">;

export interface RevenueRepo {
  getAccount(userId: string): Promise<RevenueAccount | null>;
  /** The contributor behind a published article, and whether that story is currently public and from a verified author. Null for staff-written articles. */
  contributorOf(articleId: string): Promise<{ authorId: string; publiclyPublished: boolean; authorVerified: boolean } | null>;
  listEvents(accountId: string): Promise<LedgerEvent[]>;
  getEvent(id: number): Promise<LedgerEvent | null>;
  /** Append one event. Must reject duplicates (idempotency), overdraws and double reversals, exactly like the SQL triggers. */
  append(e: NewEvent): Promise<{ ok: true; event: LedgerEvent } | { ok: false; code: "duplicate" | "insufficient_balance" | "already_reversed" | "payout_not_ready" }>;
  createPayout(accountId: string, amountPaise: number, createdBy: string, externalRef: string | null): Promise<string>;
}

export type Actor = { id: string; role: "super_admin" | "admin" | "moderator" | "editor" | "journalist" | "system" };
export type Failure = { ok: false; code: "feature_disabled" | "forbidden" | "not_found" | "ineligible" | "invalid" | "duplicate" | "insufficient_balance" | "already_reversed" | "payout_not_ready"; message: string };
export type Ok<T> = { ok: true } & T;

const fail = (code: Failure["code"], message: string): Failure => ({ ok: false, code, message });
const DISABLED = fail("feature_disabled", "Revenue sharing is not active.");

export type RevenueDeps = { repo: RevenueRepo; enabled: boolean };

function requireAdmin(actor: Actor): Failure | null {
  return actor.role === "super_admin" ? null : fail("forbidden", "Only a super-admin can move revenue.");
}

/** Credit a contributor with their share of revenue attributed to one article on one day. Safe to retry: the key is article+day. */
export async function accrue(deps: RevenueDeps, input: { articleId: string; day: string; grossPaise: number }): Promise<Failure | Ok<{ amountPaise: number; eventId: number | null }>> {
  if (!deps.enabled) return DISABLED;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.day) || !Number.isSafeInteger(input.grossPaise) || input.grossPaise < 0) return fail("invalid", "Invalid day or amount.");
  const c = await deps.repo.contributorOf(input.articleId);
  if (!c) return fail("not_found", "This article has no contributor.");
  // Earnings accrue only for stories that are public right now and from a currently verified author: a taken-down story earns nothing.
  if (!c.publiclyPublished || !c.authorVerified) return fail("ineligible", "The story is not public or the author is not verified.");
  const account = await deps.repo.getAccount(c.authorId);
  if (!account || account.status !== "active" || account.shareBps === 0) return fail("ineligible", "The contributor has no active revenue-share account.");
  const amountPaise = shareOf(input.grossPaise, account.shareBps);
  if (amountPaise === 0) return { ok: true, amountPaise: 0, eventId: null };
  const r = await deps.repo.append({ accountId: c.authorId, articleId: input.articleId, kind: "accrual", from: null, to: "pending", amountPaise, reversesEventId: null, payoutId: null, idempotencyKey: `accrual:${input.articleId}:${input.day}`, reason: null, actorId: null, actorKind: "system" });
  if (!r.ok) return r.code === "duplicate" ? { ok: true, amountPaise, eventId: null } : fail(r.code, "Could not record the accrual.");
  return { ok: true, amountPaise, eventId: r.event.id };
}

async function move(deps: RevenueDeps, actor: Actor, kind: "approval" | "release_payable", accountId: string, amountPaise: number, key: string): Promise<Failure | Ok<{ eventId: number }>> {
  if (!deps.enabled) return DISABLED;
  const denied = requireAdmin(actor);
  if (denied) return denied;
  if (!Number.isSafeInteger(amountPaise) || amountPaise <= 0) return fail("invalid", "Amount must be a positive whole number of paise.");
  const shape = kind === "approval" ? { from: "pending" as const, to: "approved" as const } : { from: "approved" as const, to: "payable" as const };
  const r = await deps.repo.append({ accountId, articleId: null, kind, ...shape, amountPaise, reversesEventId: null, payoutId: null, idempotencyKey: key, reason: null, actorId: actor.id, actorKind: "admin" });
  return r.ok ? { ok: true, eventId: r.event.id } : fail(r.code, r.code === "insufficient_balance" ? "Not enough money in the source bucket." : "Could not record the move.");
}

export const approve = (d: RevenueDeps, actor: Actor, accountId: string, amountPaise: number, key: string) => move(d, actor, "approval", accountId, amountPaise, key);
export const releasePayable = (d: RevenueDeps, actor: Actor, accountId: string, amountPaise: number, key: string) => move(d, actor, "release_payable", accountId, amountPaise, key);

/** Record that `amountPaise` was paid to the contributor OUTSIDE the app. Needs payable money and a payout-ready account. */
export async function recordPayout(deps: RevenueDeps, actor: Actor, input: { accountId: string; amountPaise: number; externalRef: string | null; key: string }): Promise<Failure | Ok<{ payoutId: string; eventId: number }>> {
  if (!deps.enabled) return DISABLED;
  const denied = requireAdmin(actor);
  if (denied) return denied;
  if (!Number.isSafeInteger(input.amountPaise) || input.amountPaise <= 0) return fail("invalid", "Amount must be a positive whole number of paise.");
  const account = await deps.repo.getAccount(input.accountId);
  if (!account) return fail("not_found", "No such account.");
  if (account.status !== "active" || !account.payoutReady) return fail("payout_not_ready", "The account is not active and payout-ready.");
  const balances = balancesOf(await deps.repo.listEvents(input.accountId));
  if (balances.payable < input.amountPaise) return fail("insufficient_balance", "Not enough payable balance.");
  const payoutId = await deps.repo.createPayout(input.accountId, input.amountPaise, actor.id, input.externalRef);
  const r = await deps.repo.append({ accountId: input.accountId, articleId: null, kind: "payout", from: "payable", to: "paid", amountPaise: input.amountPaise, reversesEventId: null, payoutId, idempotencyKey: input.key, reason: null, actorId: actor.id, actorKind: "admin" });
  return r.ok ? { ok: true, payoutId, eventId: r.event.id } : fail(r.code, "Could not record the payout.");
}

/** A signed correction: positive credits a bucket, negative debits it. Always needs a written reason. */
export async function adjust(deps: RevenueDeps, actor: Actor, input: { accountId: string; bucket: SourceBucket; amountPaise: number; reason: string; key: string }): Promise<Failure | Ok<{ eventId: number }>> {
  if (!deps.enabled) return DISABLED;
  const denied = requireAdmin(actor);
  if (denied) return denied;
  const reason = input.reason.trim();
  if (reason.length < REASON_MIN) return fail("invalid", "A written reason is required.");
  if (!Number.isSafeInteger(input.amountPaise) || input.amountPaise === 0) return fail("invalid", "Amount must be a non-zero whole number of paise.");
  const credit = input.amountPaise > 0;
  const r = await deps.repo.append({ accountId: input.accountId, articleId: null, kind: "adjustment", from: credit ? null : input.bucket, to: credit ? input.bucket : null, amountPaise: Math.abs(input.amountPaise), reversesEventId: null, payoutId: null, idempotencyKey: input.key, reason, actorId: actor.id, actorKind: "admin" });
  return r.ok ? { ok: true, eventId: r.event.id } : fail(r.code, "Could not record the adjustment.");
}

/** Undo a previous event with the opposite move (e.g. invalid traffic found after accrual). An event can be reversed once; paid money cannot. */
export async function reverse(deps: RevenueDeps, actor: Actor, input: { eventId: number; reason: string; key: string }): Promise<Failure | Ok<{ eventId: number }>> {
  if (!deps.enabled) return DISABLED;
  const denied = requireAdmin(actor);
  if (denied) return denied;
  const reason = input.reason.trim();
  if (reason.length < REASON_MIN) return fail("invalid", "A written reason is required.");
  const original = await deps.repo.getEvent(input.eventId);
  if (!original) return fail("not_found", "No such event.");
  if (original.kind === "reversal") return fail("invalid", "A reversal cannot be reversed.");
  const inv = inverseMove(original);
  if (!inv) return fail("invalid", "Money that has been paid out cannot be reversed here; record an adjustment instead.");
  const r = await deps.repo.append({ accountId: original.accountId, articleId: original.articleId, kind: "reversal", from: inv.from as SourceBucket | null, to: inv.to, amountPaise: original.amountPaise, reversesEventId: original.id, payoutId: null, idempotencyKey: input.key, reason, actorId: actor.id, actorKind: "admin" });
  return r.ok ? { ok: true, eventId: r.event.id } : fail(r.code, r.code === "insufficient_balance" ? "That money has already moved on; reverse the later step first." : "Could not reverse the event.");
}

export async function balancesFor(deps: RevenueDeps, accountId: string): Promise<Balances> {
  return balancesOf(await deps.repo.listEvents(accountId));
}

export type { EventKind };
