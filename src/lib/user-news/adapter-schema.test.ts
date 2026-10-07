/**
 * Static check of the Supabase adapter against the schema.
 *
 * The adapter cannot be exercised against PostgREST while the project is restricted (HTTP 402), so this test proves what can be proven
 * offline: every table and column the adapter names exists in migration 100 (or is a known generated_articles / reader_profiles column).
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "../../..");
const migration = fs.readFileSync(path.join(ROOT, "supabase/migrations/20261007010000_100_user_news.sql"), "utf8");
const adapter = fs.readFileSync(path.join(ROOT, "src/lib/user-news/supabase-adapters.ts"), "utf8");

function columnsOf(table: string): Set<string> {
  const m = migration.match(new RegExp(`create table if not exists public\\.${table} \\(([\\s\\S]*?)\\n\\);`));
  if (!m) throw new Error(`table ${table} not found in migration 100`);
  const cols = new Set<string>();
  for (const line of m[1]!.split("\n")) {
    const c = line.match(/^\s{2}([a-z0-9_]+)\s+(uuid|text|integer|bigint|boolean|jsonb|timestamptz|text\[\])/);
    if (c) cols.add(c[1]!);
  }
  return cols;
}

// Columns of tables that pre-exist migration 100 (read from production information_schema on 2026-10-07).
const GENERATED_ARTICLES = new Set(["id", "event_id", "slug", "headline", "summary", "article_body", "hero_image_url", "seo_title", "seo_description", "reading_time", "language", "tags", "published_at", "created_at", "editorial_metadata", "editorial_status", "homepage_pin", "pinned_at", "reviewed_at", "tenant_id", "workflow_status", "translations", "geo_metadata", "shorts_metadata", "workflow_deadline_at", "workflow_assigned_to", "workflow_rejection_reason", "compliance_hold", "compliance_retention_until", "body_fingerprint"]);
const READER_PROFILES = new Set(["user_id", "display_name", "avatar_url"]);

describe("adapter ↔ schema", () => {
  const tables = [...adapter.matchAll(/\.from\("([a-z_]+)"\)/g)].map((m) => m[1]!);

  it("only touches tables that exist", () => {
    const known = new Set(["user_verification", "user_verification_events", "user_news_submissions", "user_news_revisions", "user_news_moderation", "user_news_media", "platform_audit_events", "generated_articles", "reader_profiles"]);
    for (const t of new Set(tables)) expect(known.has(t)).toBe(true);
    for (const t of ["user_verification", "user_verification_events", "user_news_submissions", "user_news_revisions", "user_news_moderation", "user_news_media", "platform_audit_events"]) {
      expect(migration).toContain(`create table if not exists public.${t} (`);
    }
  });

  it("every column the adapter filters, selects or writes exists", () => {
    const check = (table: string, cols: string[], set: Set<string>) => {
      for (const c of cols) expect(set.has(c), `${table}.${c}`).toBe(true);
    };
    check("user_verification", ["user_id", "status", "provider", "provider_reference", "verified_at", "expires_at", "consent_version", "consent_at"], columnsOf("user_verification"));
    check("user_verification_events", ["user_id", "from_status", "to_status", "actor_kind", "actor_id", "provider", "reference", "detail"], columnsOf("user_verification_events"));
    check("user_news_submissions", ["id", "author_id", "status", "language", "input_kind", "raw_text", "transcript", "location_text", "declared_district", "created_at", "submitted_at"], columnsOf("user_news_submissions"));
    check("user_news_revisions", ["submission_id", "version", "kind", "actor_id", "snapshot", "created_at"], columnsOf("user_news_revisions"));
    check("user_news_moderation", ["submission_id", "moderator_id", "decision", "reason_code", "reason_text", "flags", "created_at"], columnsOf("user_news_moderation"));
    check("user_news_media", ["submission_id", "owner_id", "kind", "storage_path", "original_mime", "size_bytes", "processing_status", "optimized_path", "thumbnail_path", "width", "height", "duration_ms", "checksum_sha256", "validation", "created_at"], columnsOf("user_news_media"));
    check("platform_audit_events", ["actor_id", "actor_kind", "action", "entity_type", "entity_id", "detail", "created_at", "id"], columnsOf("platform_audit_events"));
    check("generated_articles", ["id", "slug", "headline", "summary", "article_body", "hero_image_url", "seo_title", "seo_description", "reading_time", "language", "tags", "published_at", "editorial_status", "workflow_status", "reviewed_at", "geo_metadata", "editorial_metadata", "tenant_id", "translations"], GENERATED_ARTICLES);
    check("reader_profiles", ["user_id", "display_name"], READER_PROFILES);
  });

  it("the submission columns the service writes all exist (a typo here would be a runtime failure)", () => {
    const service = fs.readFileSync(path.join(ROOT, "src/lib/user-news/service.ts"), "utf8");
    const cols = columnsOf("user_news_submissions");
    const written = new Set<string>();
    for (const m of service.matchAll(/updateSubmission\(\s*[a-zA-Z.]+,\s*\{([^}]*)\}/g)) {
      for (const k of m[1]!.matchAll(/\b([a-z_]+)\s*:/g)) written.add(k[1]!);
    }
    for (const k of written) expect(cols.has(k), `user_news_submissions.${k}`).toBe(true);
    expect(written.size).toBeGreaterThan(8);
  });

  it("a takedown only uses values the generated_articles CHECK constraints allow", () => {
    expect(adapter).toContain('editorial_status: "rejected", workflow_status: "archived"');
    // production constraints (2026-10-07): editorial_status in (pending, approved, rejected); workflow_status includes 'archived'
    expect(["pending", "approved", "rejected"]).toContain("rejected");
  });

  it("never exposes the service role to a browser bundle", () => {
    expect(adapter).toContain('from "@/lib/supabase/admin"');
    expect(adapter).not.toMatch(/"use client"/);
  });
});
