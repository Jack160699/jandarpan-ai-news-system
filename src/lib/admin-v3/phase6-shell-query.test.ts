import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(__dirname, "../../..");

describe("Phase 6 — no duplicate shell generated-pool query", () => {
  it("shell status and notifications share getCanonicalHealth", () => {
    const service = readFileSync(
      join(root, "src/lib/admin-v3/canonical-health-service.ts"),
      "utf8"
    );
    const incident = readFileSync(
      join(root, "src/lib/admin-v3/incident-feed.ts"),
      "utf8"
    );
    const overview = readFileSync(
      join(root, "src/lib/admin-v3/overview-daily.ts"),
      "utf8"
    );

    expect(service).toContain("export async function getCanonicalHealth");
    expect(service).toContain("CANONICAL_HEALTH_CACHE_TTL_MS");
    expect(incident).toContain("getCanonicalHealth()");
    expect(overview).toContain("getCanonicalHealth()");
    // Must not re-introduce a direct generated-pool fetch in admin shell paths.
    expect(incident).not.toContain("fetchGeneratedArticlePool");
    expect(overview).not.toContain("fetchGeneratedArticlePool");
  });

  it("health summary uses checkSupabase (bounded), not full pool", () => {
    const health = readFileSync(
      join(root, "src/lib/admin-v3/health-summary.ts"),
      "utf8"
    );
    const checks = readFileSync(
      join(root, "src/lib/observability/health/checks.ts"),
      "utf8"
    );
    expect(health).toContain("checkSupabase");
    expect(health).not.toContain("fetchGeneratedArticlePool");
    expect(checks).toContain("getGeneratedPoolSummary");
    // checkSupabase body must use summary helper (not near-full exact count).
    const supabaseFn = checks.slice(
      checks.indexOf("export async function checkSupabase"),
      checks.indexOf("export async function checkOpenAI")
    );
    expect(supabaseFn).toContain("getGeneratedPoolSummary");
    expect(supabaseFn).not.toContain('neq("editorial_status", "rejected")');
  });
});

