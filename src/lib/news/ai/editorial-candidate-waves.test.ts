import { describe, expect, it, vi } from "vitest";

import { prepareEditorialCandidateWaves } from "./editorial-candidate-waves";

describe("prepareEditorialCandidateWaves", () => {
  it("continues past safety-rejected leaders until the generation target is filled", async () => {
    const ranked = ["unsafe-1", "unsafe-2", "safe-1", "safe-2", "unused"];
    const prepare = vi.fn(async (event: string) => ({
      candidate: event.startsWith("safe") ? event : null,
    }));

    const result = await prepareEditorialCandidateWaves({
      ranked,
      limit: 2,
      concurrency: 2,
      prepare,
      isCandidate: (prepared) => prepared.candidate !== null,
    });

    expect(result.candidateCount).toBe(2);
    expect(result.attempted).toEqual([
      "unsafe-1",
      "unsafe-2",
      "safe-1",
      "safe-2",
    ]);
    expect(prepare).not.toHaveBeenCalledWith("unused");
  });

  it("stops cleanly after exhausting a fully ineligible queue", async () => {
    const result = await prepareEditorialCandidateWaves({
      ranked: [1, 2, 3],
      limit: 2,
      concurrency: 2,
      prepare: async () => ({ candidate: null }),
      isCandidate: (prepared) => prepared.candidate !== null,
    });

    expect(result.candidateCount).toBe(0);
    expect(result.attempted).toEqual([1, 2, 3]);
  });
});
