import { afterEach, describe, expect, it, vi } from "vitest";
import {
  resolveJobTenantId,
  TENANT_REQUIRED_JOB_TYPES,
} from "@/lib/infrastructure/jobs/tenant-hygiene";

vi.mock("@/lib/tenant/pipeline", () => ({
  getPipelineTenantId: () => "tenant-pipeline-default",
}));

const ORIGINAL = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL };
});

describe("Phase 8 tenant hygiene", () => {
  it("uses explicit tenant when provided", () => {
    const r = resolveJobTenantId("editorial_generate", "tenant-a");
    expect(r).toEqual({
      ok: true,
      tenantId: "tenant-a",
      resolvedFrom: "input",
    });
  });

  it("resolves pipeline default for required job types", () => {
    expect(TENANT_REQUIRED_JOB_TYPES.has("editorial_generate")).toBe(true);
    const r = resolveJobTenantId("editorial_generate", null);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.tenantId).toBe("tenant-pipeline-default");
      expect(r.resolvedFrom).toBe("pipeline_default");
    }
  });

  it("rejects missing tenant when fallback disabled", () => {
    const r = resolveJobTenantId("translate_article", null, {
      allowPipelineFallback: false,
      requireTenant: true,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("missing_tenant");
  });
});
