import { describe, expect, it } from "vitest";
import { rotateSourcesFromCursor } from "@/lib/competitor-intelligence/progress";

describe("competitor continuation cursor", () => {
  it("rotates sources after cursor", () => {
    const sources = [{ id: "a" }, { id: "b" }, { id: "c" }];
    expect(rotateSourcesFromCursor(sources, "a").map((s) => s.id)).toEqual([
      "b",
      "c",
      "a",
    ]);
  });

  it("returns original list when cursor unknown", () => {
    const sources = [{ id: "a" }, { id: "b" }];
    expect(rotateSourcesFromCursor(sources, "z")).toEqual(sources);
  });
});
