import { describe, expect, it } from "vitest";
import { isReaderDesignSystemEnabled, isReaderDesignSystemQaEnabled } from "./config";

describe("reader-ds config", () => {
  it("is off unless NEXT_PUBLIC_READER_DS=1", () => {
    const prev = process.env.NEXT_PUBLIC_READER_DS;
    process.env.NEXT_PUBLIC_READER_DS = "0";
    expect(isReaderDesignSystemEnabled()).toBe(false);
    process.env.NEXT_PUBLIC_READER_DS = "1";
    expect(isReaderDesignSystemEnabled()).toBe(true);
    process.env.NEXT_PUBLIC_READER_DS = prev;
  });

  it("blocks QA galleries on Vercel Production even when DS is on", () => {
    const prevFlag = process.env.NEXT_PUBLIC_READER_DS;
    const prevEnv = process.env.VERCEL_ENV;
    process.env.NEXT_PUBLIC_READER_DS = "1";
    process.env.VERCEL_ENV = "production";
    expect(isReaderDesignSystemQaEnabled()).toBe(false);
    process.env.VERCEL_ENV = "preview";
    expect(isReaderDesignSystemQaEnabled()).toBe(true);
    process.env.NEXT_PUBLIC_READER_DS = prevFlag;
    process.env.VERCEL_ENV = prevEnv;
  });
});
