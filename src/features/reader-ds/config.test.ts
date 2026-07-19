import { describe, expect, it } from "vitest";
import { isReaderDesignSystemEnabled } from "./config";

describe("reader-ds config", () => {
  it("is off unless NEXT_PUBLIC_READER_DS=1", () => {
    const prev = process.env.NEXT_PUBLIC_READER_DS;
    process.env.NEXT_PUBLIC_READER_DS = "0";
    expect(isReaderDesignSystemEnabled()).toBe(false);
    process.env.NEXT_PUBLIC_READER_DS = "1";
    expect(isReaderDesignSystemEnabled()).toBe(true);
    process.env.NEXT_PUBLIC_READER_DS = prev;
  });
});
