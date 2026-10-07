/**
 * Static security regression tests over the route tree.
 *
 * These read source files, not running servers: they exist so that a "temporary bypass" (like the hard-coded URL secret that once
 * guarded the newsroom-reset endpoint) fails CI instead of reaching production.
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "../../..");
const API = path.join(ROOT, "src/app/api");

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (entry.name === "route.ts" || entry.name === "route.tsx") out.push(p);
  }
  return out;
}

const rel = (p: string) => path.relative(ROOT, p).replace(/\\/g, "/");
const read = (p: string) => fs.readFileSync(p, "utf8");

/** Authorization primitives a route under /api/admin may use. Every one of them fails closed. */
const ADMIN_GUARDS = [
  "requireAnyAdminPermission",
  "requireAdminPermission",
  "requireAdminSession",
  "requireSuperAdmin",
  "requireSuperAdminSession",
  "requireEditorialAuth",
  "guardSuperAdminAction",
  "requireDashboardSession",
  "getAdminAuthorizationContext",
  "verifyCronRequest", // timing-safe, fail-closed machine-to-machine secret
  "authorized(", // local timing-safe secret helper (autonomous-rollout, trigger-editorial)
  "isAuthorized(", // local secret helper (fix-upi-day-image)
];

const adminRoutes = walk(path.join(API, "admin"));
const allRoutes = walk(API);

describe("admin API routes", () => {
  it("finds the admin routes (the scan is not silently empty)", () => {
    expect(adminRoutes.length).toBeGreaterThan(40);
  });

  it.each(adminRoutes.map((f) => [rel(f), f] as const))("%s performs an authorization check", (_name, file) => {
    const src = read(file);
    expect(ADMIN_GUARDS.some((g) => src.includes(g))).toBe(true);
  });
});

describe("no route stubs out, bypasses or hard-codes its authorization", () => {
  it.each(allRoutes.map((f) => [rel(f), f] as const))("%s", (_name, file) => {
    const src = read(file);
    // a guard replaced with a constant: `const guard = { ok: true }`
    expect(src).not.toMatch(/(guard|auth|session)\s*=\s*\{\s*ok:\s*true\s*[,}]/);
    // a secret compared with a string literal in source (e.g. ?secret=RECOVERY_RESET_123)
    expect(src).not.toMatch(/(secret|token|password|api_?key)['"]?\)?\s*[!=]==?\s*['"][A-Za-z0-9_\-]{8,}['"]/i);
    // secrets must travel in headers: a secret in the URL ends up in access logs and browser history
    expect(src).not.toMatch(/searchParams\.get\(\s*['"](secret|token|key|password|api_?key|cron_?secret)['"]\s*\)/i);
    // "temporary" bypasses
    expect(src).not.toMatch(/temp(orary)?\s+bypass|bypass\s+auth|auth\s+bypass/i);
  });
});

describe("the newsroom reset endpoint", () => {
  const file = path.join(API, "admin/system/reset-newsroom/route.ts");
  const src = read(file);

  it("requires a real super-admin session", () => {
    expect(src).toContain("requireSuperAdminSession(request)");
    expect(src).toMatch(/if \(!guard\.ok\) return guard\.response;/);
  });

  it("has no hard-coded recovery secret", () => {
    expect(src).not.toContain("RECOVERY_RESET");
    expect(src).not.toMatch(/searchParams\.get\(['"]secret['"]\)/);
  });

  it("requires a typed confirmation before the destructive mode runs", () => {
    expect(src).toContain("DELETE_ALL_NEWSROOM_CONTENT");
    expect(src.indexOf("confirmation_required")).toBeLessThan(src.indexOf('await supabase.from("generated_articles").delete()'));
  });
});

describe("cron endpoints fail closed", () => {
  it("compliance-monthly no longer skips auth when CRON_SECRET is unset", () => {
    const src = read(path.join(API, "cron/compliance-monthly/route.ts"));
    expect(src).toContain("verifyCronRequest");
    expect(src).not.toMatch(/if \(cronSecret &&/);
  });
});
