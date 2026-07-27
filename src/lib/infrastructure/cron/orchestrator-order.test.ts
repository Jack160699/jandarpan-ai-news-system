import { describe, expect, it } from "vitest";
import { INTELLIGENCE_PIPELINE } from "./orchestrator";

describe("orchestrator worker ordering", () => {
  it("runs job_processor first — it is the only path that drains event_cluster, which unblocks everything downstream", () => {
    const jobProcessor = INTELLIGENCE_PIPELINE.indexOf("job_processor");
    expect(jobProcessor).toBe(0);
  });

  it("runs editorial images right after job_processor, before lower-priority intelligence maintenance", () => {
    const images = INTELLIGENCE_PIPELINE.indexOf("editorial_images");
    expect(images).toBeGreaterThan(-1);
    expect(images).toBeLessThan(INTELLIGENCE_PIPELINE.indexOf("ai_enrich"));
    expect(images).toBeLessThan(
      INTELLIGENCE_PIPELINE.indexOf("intelligence_embed")
    );
    expect(images).toBeLessThan(
      INTELLIGENCE_PIPELINE.indexOf("intelligence_snapshot")
    );
  });

  it("keeps ai_enrich ahead of the remaining lower-priority intelligence maintenance it was already ordered before", () => {
    const aiEnrich = INTELLIGENCE_PIPELINE.indexOf("ai_enrich");
    expect(aiEnrich).toBeLessThan(
      INTELLIGENCE_PIPELINE.indexOf("intelligence_embed")
    );
    expect(aiEnrich).toBeLessThan(
      INTELLIGENCE_PIPELINE.indexOf("intelligence_snapshot")
    );
    expect(aiEnrich).toBeLessThan(
      INTELLIGENCE_PIPELINE.indexOf("analytics_aggregate")
    );
  });
});
