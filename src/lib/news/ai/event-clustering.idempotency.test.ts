/**
 * Regression: the same news signal can never found more than one news event, however many clustering cycles run
 * (production bug: ~46% of signals were re-clustered into NEW events every run because "already clustered" was read
 * through a 1,000-row API cap while 2,900+ events were in the window).
 *
 * The fake database below implements the CONTRACT of migration 092 -- signal_id-keyed ownership claims, the
 * jd_unclustered_signals() anti-join, and the BEFORE INSERT/UPDATE ownership trigger -- and enforces a hard 1,000-row
 * API cap on every list read, exactly like PostgREST max_rows. The SQL itself was verified against production in a
 * rolled-back transaction (see the migration notes).
 */

import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

type Sig = {
  id: string; source: string; provider: string; title: string; raw_content: string; article_url: string;
  published_at: string; category: string; region: string; language: string; geo_metadata: unknown; created_at: string;
};
type Ev = {
  id: string; canonical_title: string; event_summary: string | null; region: string | null; category: string | null;
  urgency_score: number; source_count: number; signal_ids: string[]; clustering_metadata: Record<string, unknown>;
  coverage_slug: string | null; coverage_headline: string | null; cluster_confidence: number | null; is_live: boolean;
  coverage_status: string; created_at: string; updated_at: string;
};

const API_MAX_ROWS = 1000;

class FakeDb {
  signals: Sig[] = [];
  events: Ev[] = [];
  claims = new Map<string, string>();
  seq = 0;
  rpcCalls = 0;

  addSignals(n: number, titleFor: (i: number) => string, startAt = 0, ageMinutes = 30): void {
    for (let i = startAt; i < startAt + n; i++) {
      const at = new Date(Date.now() - (ageMinutes + (i - startAt)) * 60_000).toISOString();
      this.signals.push({
        id: `sig-${String(i).padStart(5, "0")}`, source: `Src ${i % 7}`, provider: "rss", title: titleFor(i),
        raw_content: `${titleFor(i)} details`, article_url: `https://example.test/${i}`, published_at: at,
        category: "regional", region: "chhattisgarh", language: "hi", geo_metadata: null, created_at: at,
      });
    }
  }

  /** BEFORE INSERT / UPDATE OF signal_ids trigger (migration 092). Returns null when an INSERT must be skipped. */
  applyOwnership(row: Ev, op: "insert" | "update", oldIds: string[] = []): Ev | null {
    const requested = op === "update" ? row.signal_ids.filter((x) => !oldIds.includes(x)) : [...row.signal_ids];
    const existing = new Set(this.signals.map((s) => s.id));
    for (const id of requested) if (existing.has(id) && !this.claims.has(id)) this.claims.set(id, row.id);
    const lost = requested.filter((id) => this.claims.has(id) && this.claims.get(id) !== row.id);
    if (lost.length) {
      row.signal_ids = row.signal_ids.filter((id) => !lost.includes(id));
      row.source_count = row.signal_ids.length;
      if (op === "insert" && row.signal_ids.length === 0) return null;
    }
    return row;
  }

  rpc(name: string, args: { p_since: string; p_limit: number }) {
    this.rpcCalls++;
    if (name !== "jd_unclustered_signals") return Promise.resolve({ data: null, error: { message: "unknown rpc" } });
    const since = Date.parse(args.p_since);
    const rows = this.signals
      .filter((s) => Date.parse(s.published_at) >= since && !this.claims.has(s.id))
      .sort((a, b) => Date.parse(b.published_at) - Date.parse(a.published_at))
      .slice(0, Math.min(args.p_limit, 500));
    return Promise.resolve({ data: rows, error: null });
  }

  from(table: string) {
    const db = this;
    let op: "select" | "insert" | "update" = "select";
    let payload: Record<string, unknown> = {};
    let eqId: string | undefined;
    let ids: string[] | undefined;
    let mode: "list" | "single" | "maybe" = "list";
    const api: Record<string, unknown> = {
      select: () => api,
      insert: (p: Record<string, unknown>) => { op = "insert"; payload = p; return api; },
      update: (p: Record<string, unknown>) => { op = "update"; payload = p; return api; },
      eq: (col: string, v: string) => { if (col === "id") eqId = v; return api; },
      in: (_c: string, v: string[]) => { ids = v; return api; },
      gte: () => api, neq: () => api, order: () => api, limit: () => api,
      single: () => { mode = "single"; return api; },
      maybeSingle: () => { mode = "maybe"; return api; },
      then: (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) => Promise.resolve(run()).then(res, rej),
    };
    const run = (): { data: unknown; error: { code?: string; message: string } | null } => {
      if (table === "coverage_updates") return { data: { id: "cu" }, error: null };
      if (table === "news_signals") {
        return { data: db.signals.filter((s) => ids?.includes(s.id)).slice(0, API_MAX_ROWS), error: null };
      }
      if (table !== "news_events") return { data: [], error: null };
      if (op === "insert") {
        const now = new Date().toISOString();
        const row = { ...(payload as unknown as Ev), id: `evt-${++db.seq}`, coverage_status: "active", created_at: now, updated_at: now } as Ev;
        row.clustering_metadata = (payload.clustering_metadata as Record<string, unknown>) ?? {};
        const kept = db.applyOwnership(row, "insert");
        if (!kept) return { data: null, error: { code: "PGRST116", message: "0 rows" } };
        db.events.push(kept);
        return { data: { id: kept.id }, error: null };
      }
      if (op === "update") {
        const ev = db.events.find((e) => e.id === eqId);
        if (!ev) return { data: null, error: { message: "not found" } };
        const old = [...ev.signal_ids];
        Object.assign(ev, payload);
        if (payload.signal_ids) db.applyOwnership(ev, "update", old);
        return { data: { id: ev.id, signal_ids: ev.signal_ids }, error: null };
      }
      if (mode === "maybe") {
        const ev = db.events.find((e) => e.id === eqId);
        return { data: ev ? { clustering_metadata: ev.clustering_metadata, signal_ids: ev.signal_ids } : null, error: null };
      }
      // list read: newest-updated first, hard API cap like PostgREST max_rows
      const list = db.events
        .filter((e) => e.coverage_status === "active")
        .sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at));
      return { data: list.slice(0, API_MAX_ROWS), error: null };
    };
    return api;
  }
}

let db: FakeDb;
vi.mock("@/lib/supabase", () => ({ createAdminServerClient: () => db }));
vi.mock("@/lib/newsroom/logger", () => ({ logNewsroom: () => {} }));

import {
  clusterSignalsIntoEvents,
  dedupeSignalsById,
  fetchUnprocessedSignals,
  findNearIdenticalEvent,
} from "./event-clustering";
import { selectUnblockedDistinctStories, storyKey } from "./candidate-attempts";

// Every signal gets a headline made only of hash-derived words unique to it, so distinct signals never cluster together.
const word = (i: number, k: number): string =>
  createHash("sha1").update(`${i}:${k}`).digest("hex").slice(0, 9).replace(/[0-9]/g, (d) => "ghijklmnop"[Number(d)]!);
const uniqueTitle = (i: number) => [0, 1, 2, 3, 4, 5].map((k) => word(i, k)).join(" ");

const eventsOf = (signalId: string) => db.events.filter((e) => e.signal_ids.includes(signalId));

beforeEach(() => {
  db = new FakeDb();
  vi.spyOn(console, "log").mockImplementation(() => {});
  delete process.env.NEWSROOM_USE_EMBEDDINGS;
});

describe("clustering is idempotent: a signal founds at most one event", () => {
  it("repeated cycles over 300 signals never create a second event for any signal", async () => {
    db.addSignals(300, uniqueTitle);
    for (let cycle = 0; cycle < 3; cycle++) await clusterSignalsIntoEvents({ limit: 120 });
    const created = db.events.length;
    expect(created).toBe(300);
    for (let cycle = 0; cycle < 6; cycle++) {
      const r = await clusterSignalsIntoEvents({ limit: 120 });
      expect(r.eventsCreated).toBe(0);
      expect(r.signalsProcessed).toBe(0);
    }
    expect(db.events.length).toBe(created);
    for (const s of db.signals) expect(eventsOf(s.id)).toHaveLength(1);
  });

  it("is NOT defeated by thousands of existing events (the 1,000-row API cap that caused the production loop)", async () => {
    db.addSignals(2500, uniqueTitle);
    // 2,500 signals already clustered into 2,500 events -- more than the API will ever return in one read.
    for (const s of db.signals) {
      const id = `seed-${s.id}`;
      db.events.push({
        id, canonical_title: s.title, event_summary: null, region: "chhattisgarh", category: "regional", urgency_score: 10,
        source_count: 1, signal_ids: [s.id], clustering_metadata: {}, coverage_slug: null, coverage_headline: null,
        cluster_confidence: 0.5, is_live: false, coverage_status: "active", created_at: s.created_at, updated_at: s.created_at,
      });
      db.claims.set(s.id, id);
    }
    const before = db.events.length;
    db.addSignals(40, uniqueTitle, 5000, 1);
    for (let cycle = 0; cycle < 5; cycle++) await clusterSignalsIntoEvents({ limit: 120 });
    expect(db.events.length).toBe(before + 40); // only the 40 genuinely new signals created events
    for (const s of db.signals) expect(eventsOf(s.id)).toHaveLength(1);
  });

  it("two overlapping workers handed the same batch still produce one event per signal (the database arbitrates)", async () => {
    db.addSignals(60, uniqueTitle);
    await Promise.all([clusterSignalsIntoEvents({ limit: 120 }), clusterSignalsIntoEvents({ limit: 120 })]);
    for (let cycle = 0; cycle < 2; cycle++) await clusterSignalsIntoEvents({ limit: 120 });
    for (const s of db.signals) expect(eventsOf(s.id)).toHaveLength(1);
    expect(db.events.length).toBe(60);
  });

  it("a later re-listing of the same story joins the existing event instead of founding a near-identical one", async () => {
    db.addSignals(1, () => "रायपुर में नया पुल बनने का काम शुरू, कलेक्टर ने किया निरीक्षण आज सुबह");
    await clusterSignalsIntoEvents({ limit: 120 });
    expect(db.events).toHaveLength(1);
    db.signals.push({
      ...db.signals[0]!, id: "sig-relisted", article_url: "https://other.test/relisted", source: "Other",
      published_at: new Date().toISOString(),
    });
    for (let cycle = 0; cycle < 3; cycle++) await clusterSignalsIntoEvents({ limit: 120 });
    expect(db.events).toHaveLength(1);
    expect(db.events[0]!.signal_ids.sort()).toEqual(["sig-00000", "sig-relisted"]);
  });

  it("when the database skips a duplicate insert, the cycle reports it instead of failing or double-counting", async () => {
    db.addSignals(3, uniqueTitle);
    const first = await fetchUnprocessedSignals(120, 72);
    expect(first).toHaveLength(3);
    // Another worker claims them between our read and our insert.
    for (const s of first) db.claims.set(s.id, "other-worker-event");
    const orig = db.rpc.bind(db);
    db.rpc = ((name: string, args: { p_since: string; p_limit: number }) =>
      db.rpcCalls === 0 ? (db.rpcCalls++, Promise.resolve({ data: first, error: null })) : orig(name, args)) as typeof db.rpc;
    const r = await clusterSignalsIntoEvents({ limit: 120 });
    expect(r.eventsCreated).toBe(0);
    expect(db.events).toHaveLength(0);
  });
});

describe("unprocessed-signal selection", () => {
  it("reads through the bounded RPC and fails CLOSED on error (never falls back to the capped lookup)", async () => {
    db.addSignals(5, uniqueTitle);
    db.rpc = (() => Promise.resolve({ data: null, error: { message: "function does not exist" } })) as typeof db.rpc;
    expect(await fetchUnprocessedSignals(120, 72)).toEqual([]);
  });

  it("returns only unclaimed signals, never more than the limit, each once", async () => {
    db.addSignals(50, uniqueTitle);
    for (const s of db.signals.slice(0, 20)) db.claims.set(s.id, "e");
    const rows = await fetchUnprocessedSignals(10, 72);
    expect(rows).toHaveLength(10);
    expect(new Set(rows.map((r) => r.id)).size).toBe(10);
    expect(rows.every((r) => !db.claims.has(r.id))).toBe(true);
  });

  it("dedupeSignalsById keeps the first occurrence", () => {
    expect(dedupeSignalsById([{ id: "a", n: 1 }, { id: "b", n: 2 }, { id: "a", n: 3 }])).toEqual([{ id: "a", n: 1 }, { id: "b", n: 2 }]);
  });

  it("the client no longer derives 'already clustered' from news_events.signal_ids", () => {
    const src = fs.readFileSync(path.join(__dirname, "event-clustering.ts"), "utf8");
    expect(src).not.toMatch(/select\(\s*["']signal_ids["']\s*\)/);
    expect(src).toMatch(/jd_unclustered_signals/);
  });
});

describe("near-identical event guard", () => {
  it("matches an identical or near-identical title and ignores a different story", () => {
    const pool = [{ canonical_title: "रायपुर में नया पुल बनने का काम शुरू" }, { canonical_title: "दुर्ग में बारिश से जलभराव" }];
    expect(findNearIdenticalEvent("रायपुर में नया पुल बनने का काम शुरू", pool)).toBe(pool[0]);
    expect(findNearIdenticalEvent("बिलासपुर में सड़क हादसा", pool)).toBeNull();
  });
});

describe("candidate backoff cannot be defeated by a duplicate event", () => {
  const now = Date.now();
  const blocked = { attempts: 2, nextRetryAt: now + 3_600_000, deadLettered: false };

  it("an event whose same-titled twin is in backoff is blocked too", () => {
    const events = [
      { id: "orig", canonical_title: "रायपुर में नया पुल बनने का काम शुरू" },
      { id: "twin", canonical_title: "रायपुर में नया पुल बनने का काम शुरू!" },
      { id: "other", canonical_title: "दुर्ग में बारिश से जलभराव" },
    ];
    const out = selectUnblockedDistinctStories(events, new Map([["orig", blocked]]), now);
    expect(out.map((e) => e.id)).toEqual(["other"]);
  });

  it("dead-lettered twins block the story permanently; unrelated events are untouched", () => {
    const events = [
      { id: "a", canonical_title: "Bhilai steel plant accident" },
      { id: "b", canonical_title: "bhilai   steel plant ACCIDENT" },
    ];
    expect(selectUnblockedDistinctStories(events, new Map([["a", { attempts: 4, nextRetryAt: null, deadLettered: true }]]), now)).toEqual([]);
  });

  it("a slate holds each story once even when no twin is blocked", () => {
    const events = [{ id: "a", canonical_title: "Same Story" }, { id: "b", canonical_title: "same story" }, { id: "c", canonical_title: "Another" }];
    expect(selectUnblockedDistinctStories(events, new Map(), now).map((e) => e.id)).toEqual(["a", "c"]);
    expect(storyKey("Same  Story!")).toBe(storyKey("same story"));
  });
});

describe("migration 092 contract", () => {
  const sql = fs.readFileSync(
    path.join(__dirname, "../../../../supabase/migrations/20261002010000_092_event_signal_ownership.sql"),
    "utf8"
  );

  it("enforces one owner per signal in the database", () => {
    expect(sql).toMatch(/signal_id uuid primary key references public\.news_signals\(id\) on delete cascade/);
    expect(sql).toMatch(/before insert or update of signal_ids on public\.news_events/);
    expect(sql).toMatch(/on conflict \(signal_id\) do nothing/);
    expect(sql).toMatch(/return null; -- every signal already belongs/);
  });

  it("the unclustered query is bounded and anti-joins the claims table", () => {
    expect(sql).toMatch(/not exists \(select 1 from public\.news_event_signal_claims c where c\.signal_id = s\.id\)/);
    expect(sql).toMatch(/limit greatest\(1, least\(coalesce\(p_limit, 120\), 500\)\)/);
  });

  it("remediation is reversible (marks, never deletes) and never touches events that have an article", () => {
    expect(sql).not.toMatch(/delete\s+from\s+public\.news_events/i);
    expect(sql).toMatch(/superseded_prev_status/);
    expect(sql).toMatch(/not exists \(select 1 from public\.generated_articles g where g\.event_id = e\.id\)/);
  });
});
