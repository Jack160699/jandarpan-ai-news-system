import { describe, expect, it } from "vitest";
import { INTELLIGENCE_PIPELINE } from "./orchestrator";

describe("orchestrator worker ordering", () => {
  it("runs editorial images before lower-priority intelligence maintenance", () => {
    const images = INTELLIGENCE_PIPELINE.indexOf("editorial_images");
    expect(images).toBeGreaterThan(-1);
    expect(images).toBeLessThan(
      INTELLIGENCE_PIPELINE.indexOf("job_processor")
    );
    expect(images).toBeLessThan(
      INTELLIGENCE_PIPELINE.indexOf("intelligence_embed")
    );
    expect(images).toBeLessThan(
      INTELLIGENCE_PIPELINE.indexOf("intelligence_snapshot")
    );
  });
});
