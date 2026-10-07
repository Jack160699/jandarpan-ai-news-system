/**
 * The status state machine exists twice on purpose: in TypeScript (what the API applies) and in SQL (a trigger that refuses an
 * invalid move even if server code has a bug). This test fails if they ever disagree.
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { SUBMISSION_STATUSES, allowedTransitions, type Actor } from "@/lib/user-news/status-machine";

const ROOT = path.resolve(__dirname, "../../..");
const MIGRATION = fs.readFileSync(path.join(ROOT, "supabase/migrations/20261007010000_100_user_news.sql"), "utf8");

function sqlTransitions(): Set<string> {
  const fn = MIGRATION.slice(MIGRATION.indexOf("function public.user_news_transition_allowed"), MIGRATION.indexOf("function public.user_news_status_guard"));
  const pairs = new Set<string>();
  for (const m of fn.matchAll(/\('([a-z_]+)',\s*'([a-z_]+)'\)/g)) pairs.add(`${m[1]}->${m[2]}`);
  return pairs;
}

function tsTransitions(): Set<string> {
  const pairs = new Set<string>();
  for (const from of SUBMISSION_STATUSES) {
    for (const actor of ["author", "moderator", "system"] as Actor[]) {
      for (const to of allowedTransitions(from, actor)) if (to !== from) pairs.add(`${from}->${to}`); // self-loops are edits, not status changes
    }
  }
  return pairs;
}

describe("status machine: TypeScript and SQL agree exactly", () => {
  it("the SQL transition table equals the union of every actor's allowed moves", () => {
    const sql = [...sqlTransitions()].sort();
    const ts = [...tsTransitions()].sort();
    expect(sql).toEqual(ts);
    expect(sql.length).toBeGreaterThan(15);
  });

  it("the SQL CHECK list of statuses equals the TypeScript list", () => {
    const m = MIGRATION.match(/status\s+text not null default 'draft'\s+check \(status in \(([^)]*)\)\)/);
    expect(m).not.toBeNull();
    const sqlStatuses = [...m![1]!.matchAll(/'([a-z_]+)'/g)].map((x) => x[1]).sort();
    expect(sqlStatuses).toEqual([...SUBMISSION_STATUSES].sort());
  });
});

describe("the migration carries the invariants the product promises", () => {
  it("requires the author's recorded approval before moderation", () => {
    expect(MIGRATION).toMatch(/check \(status not in \('submitted', 'under_review', 'approved', 'published'\) or user_approved_at is not null\)/);
  });

  it("makes history and audit tables append-only and stores no identity numbers", () => {
    for (const t of ["user_verification_events", "user_news_revisions", "user_news_moderation", "platform_audit_events"]) {
      expect(MIGRATION).toMatch(new RegExp(`create trigger ${t}_append_only before update or delete on public\\.${t}`));
    }
    // there is no column that could hold an identity number, OTP or biometric
    expect(MIGRATION.toLowerCase()).not.toMatch(/\b(aadhaar|aadhar|otp|biometric|fingerprint)_?\w*\s+(text|bytea|varchar|integer|bigint)/);
  });

  it("gives end users read-only access and no storage policies (signed URLs only)", () => {
    expect(MIGRATION).toContain("revoke insert, update, delete, truncate on");
    expect(MIGRATION).not.toMatch(/create policy[^;]*on storage\.objects/i);
    expect(MIGRATION).toMatch(/'user-news-media', 'user-news-media', false/); // private bucket
  });
});
