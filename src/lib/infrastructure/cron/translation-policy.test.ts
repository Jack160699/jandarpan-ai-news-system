import { describe, expect, it } from "vitest";
import { shouldProcessTranslationBackfill } from "@/lib/infrastructure/cron/translation-policy";

describe("translation-policy", () => {
  it("allows processing on scheduled translation-backfill cron by default", () => {
    const prev = process.env.TRANSLATION_BACKFILL_ENQUEUE_ONLY;
    delete process.env.TRANSLATION_BACKFILL_ENQUEUE_ONLY;
    expect(shouldProcessTranslationBackfill("scheduled_cron")).toEqual({
      allowed: true,
      reason: "dedicated_translation_backfill_lane",
    });
    if (prev === undefined) delete process.env.TRANSLATION_BACKFILL_ENQUEUE_ONLY;
    else process.env.TRANSLATION_BACKFILL_ENQUEUE_ONLY = prev;
  });

  it("allows vercel_backup and manual_override", () => {
    expect(shouldProcessTranslationBackfill("vercel_backup").allowed).toBe(true);
    expect(shouldProcessTranslationBackfill("manual_override").allowed).toBe(true);
    expect(shouldProcessTranslationBackfill("dedicated_lane").allowed).toBe(true);
  });

  it("honors enqueue-only escape hatch", () => {
    const prev = process.env.TRANSLATION_BACKFILL_ENQUEUE_ONLY;
    process.env.TRANSLATION_BACKFILL_ENQUEUE_ONLY = "true";
    expect(shouldProcessTranslationBackfill("scheduled_cron")).toEqual({
      allowed: false,
      reason: "enqueue_only_env",
    });
    if (prev === undefined) delete process.env.TRANSLATION_BACKFILL_ENQUEUE_ONLY;
    else process.env.TRANSLATION_BACKFILL_ENQUEUE_ONLY = prev;
  });
});
