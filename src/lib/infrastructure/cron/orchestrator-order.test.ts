import { describe, expect, it } from "vitest";
import { INTELLIGENCE_PIPELINE } from "./orchestrator";

describe("orchestrator worker ordering", () => {
  it("runs lean pipeline with editorial_generate first and editorial_images after", () => {
    const editorialGenerate = INTELLIGENCE_PIPELINE.indexOf("editorial_generate");
    const editorialImages = INTELLIGENCE_PIPELINE.indexOf("editorial_images");
    expect(editorialGenerate).toBe(0);
    expect(editorialImages).toBe(1);
  });
});
