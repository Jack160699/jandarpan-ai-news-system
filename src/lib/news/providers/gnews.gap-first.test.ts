import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/news/http", () => ({
  fetchJson: vi.fn(),
}));

vi.mock("@/lib/news/ingestion/source-state", () => ({
  buildSourceKey: () => "gnews:api",
  isSourceCurrentlyBlocked: () => ({ blocked: false }),
  loadIngestionSourceState: async () => ({}),
  markProviderQuotaExhausted: vi.fn(async () => undefined),
  nextUtcMidnightIso: () => "2026-07-22T00:00:00.000Z",
}));

import { fetchJson } from "@/lib/news/http";
import {
  fetchGNewsGapFirst,
  isGNewsGapFirstEnabled,
} from "@/lib/news/providers/gnews";

describe("gnews gap-first selection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GNEWS_API_KEY = "test-key";
  });

  it("defaults gap-first on when kill switch is off", () => {
    expect(
      isGNewsGapFirstEnabled({
        AUTONOMOUS_KILL_SWITCH: "",
        GNEWS_GAP_FIRST: "",
      } as NodeJS.ProcessEnv)
    ).toBe(true);
  });

  it("disables gap-first when kill switch is on", () => {
    expect(
      isGNewsGapFirstEnabled({
        AUTONOMOUS_KILL_SWITCH: "true",
      } as NodeJS.ProcessEnv)
    ).toBe(false);
  });

  it("shadow mode runs only first 2 planned queries", async () => {
    vi.mocked(fetchJson).mockResolvedValue({
      data: {
        articles: [
          {
            title: "Sample",
            url: "https://example.com/a",
            publishedAt: "2026-07-21T10:00:00Z",
            source: { name: "Example" },
          },
        ],
      },
    });

    const result = await fetchGNewsGapFirst({
      env: {
        AUTONOMOUS_ROLLOUT_STAGE: "shadow",
        GNEWS_API_KEY: "test-key",
      } as NodeJS.ProcessEnv,
      queries: [
        {
          districtSlug: "raipur",
          query: "raipur Chhattisgarh news",
          bucket: "gaps",
          deficit: 7,
        },
        {
          districtSlug: "durg",
          query: "durg Chhattisgarh news",
          bucket: "gaps",
          deficit: 5,
        },
        {
          districtSlug: "korba",
          query: "korba Chhattisgarh news",
          bucket: "gaps",
          deficit: 4,
        },
      ],
    });

    expect(result.mode).toBe("gap_first_shadow_sample");
    expect(result.queriesRun).toHaveLength(2);
    expect(result.queriesRun[0]).toContain("raipur");
    expect(result.queriesRun[1]).toContain("durg");
    expect(vi.mocked(fetchJson).mock.calls.length).toBe(2);
  });

  it("stage_1 runs full planned query list (no sample cap)", async () => {
    vi.mocked(fetchJson).mockResolvedValue({
      data: { articles: [] },
    });

    const result = await fetchGNewsGapFirst({
      env: {
        AUTONOMOUS_ROLLOUT_STAGE: "stage_1",
        GNEWS_API_KEY: "test-key",
      } as NodeJS.ProcessEnv,
      queries: [
        {
          districtSlug: "raipur",
          query: "raipur Chhattisgarh news",
          bucket: "gaps",
          deficit: 7,
        },
        {
          districtSlug: "durg",
          query: "durg Chhattisgarh news",
          bucket: "gaps",
          deficit: 5,
        },
        {
          districtSlug: "korba",
          query: "korba Chhattisgarh news",
          bucket: "gaps",
          deficit: 4,
        },
      ],
    });

    expect(result.mode).toBe("gap_first");
    expect(result.queriesRun).toHaveLength(3);
  });
});
